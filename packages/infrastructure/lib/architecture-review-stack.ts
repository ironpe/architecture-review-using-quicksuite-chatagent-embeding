import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { Construct } from 'constructs';

export class ArchitectureReviewStack extends cdk.Stack {
  public readonly filesBucket: s3.Bucket;
  public readonly documentsTable: dynamodb.Table;
  public readonly api: apigateway.RestApi;
  public readonly lambdaExecutionRole: iam.Role;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket for file storage
    this.filesBucket = new s3.Bucket(this, 'ArchitectureReviewFiles', {
      bucketName: `architecture-review-files-${this.account}-${this.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
          ],
          allowedOrigins: ['*'], // TODO: Restrict to frontend domain in production
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        {
          id: 'DeleteIncompleteUploads',
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
          enabled: true,
        },
      ],
    });

    // DynamoDB table for document metadata
    this.documentsTable = new dynamodb.Table(this, 'ArchitectureReviewDocuments', {
      tableName: 'architecture-review-documents',
      partitionKey: {
        name: 'documentId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Global Secondary Index for sorting by upload timestamp
    this.documentsTable.addGlobalSecondaryIndex({
      indexName: 'uploadTimestamp-index',
      partitionKey: {
        name: 'uploadTimestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Output the bucket name for reference
    new cdk.CfnOutput(this, 'FilesBucketName', {
      value: this.filesBucket.bucketName,
      description: 'S3 bucket for storing uploaded files',
    });

    // Output the table name for reference
    new cdk.CfnOutput(this, 'DocumentsTableName', {
      value: this.documentsTable.tableName,
      description: 'DynamoDB table for document metadata',
    });

    // API Gateway REST API
    this.api = new apigateway.RestApi(this, 'ArchitectureReviewApi', {
      restApiName: 'Architecture Review API',
      description: 'API for document upload and preview system',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS, // TODO: Restrict to frontend domain in production
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        allowCredentials: true,
      },
    });

    // API resources structure (will be connected to Lambda functions in subsequent tasks)
    const documentsResource = this.api.root.addResource('documents');
    const uploadUrlResource = documentsResource.addResource('upload-url');
    const metadataResource = documentsResource.addResource('metadata');
    const searchResource = documentsResource.addResource('search');
    const reviewResource = documentsResource.addResource('review');
    const reviewByIdResource = reviewResource.addResource('{documentId}');
    const documentByIdResource = documentsResource.addResource('{documentId}');

    // Output the API endpoint
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
    });

    // IAM role for Lambda functions
    this.lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for Architecture Review Lambda functions',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant S3 permissions to Lambda role
    this.filesBucket.grantReadWrite(this.lambdaExecutionRole);
    this.filesBucket.grantDelete(this.lambdaExecutionRole);
    this.filesBucket.grantPutAcl(this.lambdaExecutionRole);

    // Grant DynamoDB permissions to Lambda role
    this.documentsTable.grantReadWriteData(this.lambdaExecutionRole);

    // Grant permission to generate pre-signed URLs
    this.lambdaExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:GetObject', 's3:PutObject'],
        resources: [`${this.filesBucket.bucketArn}/*`],
      })
    );

    // Grant QuickSight permissions to Lambda role
    this.lambdaExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'quicksight:GenerateEmbedUrlForRegisteredUser',
          'quicksight:DescribeUser',
        ],
        resources: [
          `arn:aws:quicksight:${this.region}:${this.account}:user/*`,
          `arn:aws:quicksight:${this.region}:${this.account}:namespace/default`,
        ],
      })
    );

    // Lambda function for upload URL generation
    const uploadUrlHandler = new lambda.Function(this, 'UploadUrlHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/upload-url.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist'), {
        exclude: ['**/*.d.ts', '**/*.d.ts.map', '**/*.js.map', '**/*.test.mjs', '**/*.test.mjs.map'],
      }),
      role: this.lambdaExecutionRole,
      environment: {
        BUCKET_NAME: this.filesBucket.bucketName,
        TABLE_NAME: this.documentsTable.tableName,
        NODE_OPTIONS: '--enable-source-maps',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Lambda function for metadata storage
    const metadataHandler = new lambda.Function(this, 'MetadataHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/metadata.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      role: this.lambdaExecutionRole,
      environment: {
        BUCKET_NAME: this.filesBucket.bucketName,
        TABLE_NAME: this.documentsTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Lambda function for listing documents
    const listDocumentsHandler = new lambda.Function(this, 'ListDocumentsHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/list-documents.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      role: this.lambdaExecutionRole,
      environment: {
        TABLE_NAME: this.documentsTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Lambda function for searching documents
    const searchDocumentsHandler = new lambda.Function(this, 'SearchDocumentsHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/search-documents.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      role: this.lambdaExecutionRole,
      environment: {
        TABLE_NAME: this.documentsTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Lambda function for getting a single document
    const getDocumentHandler = new lambda.Function(this, 'GetDocumentHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/get-document.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      role: this.lambdaExecutionRole,
      environment: {
        TABLE_NAME: this.documentsTable.tableName,
        BUCKET_NAME: this.filesBucket.bucketName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Lambda function for QuickSight embed URL generation
    const quicksightEmbedHandler = new lambda.Function(this, 'QuickSightEmbedHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/quicksight-embed.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      role: this.lambdaExecutionRole,
      environment: {
        QUICKSIGHT_ACCOUNT_ID: this.account,
        QUICKSIGHT_AGENT_ARN: process.env.QUICKSIGHT_AGENT_ARN || '',
        QUICKSIGHT_NAMESPACE: 'default',
        QUICKSIGHT_USER_NAME: process.env.QUICKSIGHT_USER_NAME || 'qsadmin',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Lambda function for updating review information
    const updateReviewHandler = new lambda.Function(this, 'UpdateReviewHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/update-review.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      role: this.lambdaExecutionRole,
      environment: {
        TABLE_NAME: this.documentsTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Lambda function for MCP Server
    const mcpServerHandler = new lambda.Function(this, 'McpServerHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambda.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../mcp-server/dist')),
      role: this.lambdaExecutionRole,
      environment: {
        TABLE_NAME: this.documentsTable.tableName,
        BUCKET_NAME: this.filesBucket.bucketName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    // Lambda function for deleting documents
    const deleteDocumentHandler = new lambda.Function(this, 'DeleteDocumentHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/delete-document.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      role: this.lambdaExecutionRole,
      environment: {
        TABLE_NAME: this.documentsTable.tableName,
        BUCKET_NAME: this.filesBucket.bucketName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Lambda function for getting review content
    const getReviewHandler = new lambda.Function(this, 'GetReviewHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/get-review.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      role: this.lambdaExecutionRole,
      environment: {
        TABLE_NAME: this.documentsTable.tableName,
        BUCKET_NAME: this.filesBucket.bucketName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Connect Lambda to API Gateway
    uploadUrlResource.addMethod('POST', new apigateway.LambdaIntegration(uploadUrlHandler));
    metadataResource.addMethod('POST', new apigateway.LambdaIntegration(metadataHandler));
    documentsResource.addMethod('GET', new apigateway.LambdaIntegration(listDocumentsHandler));
    searchResource.addMethod('GET', new apigateway.LambdaIntegration(searchDocumentsHandler));
    documentByIdResource.addMethod('GET', new apigateway.LambdaIntegration(getDocumentHandler));
    documentByIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(deleteDocumentHandler));
    reviewResource.addMethod('PUT', new apigateway.LambdaIntegration(updateReviewHandler));
    reviewByIdResource.addMethod('GET', new apigateway.LambdaIntegration(getReviewHandler));

    // QuickSight embed URL endpoint
    const quicksightResource = this.api.root.addResource('quicksight');
    const embedUrlResource = quicksightResource.addResource('embed-url');
    embedUrlResource.addMethod('GET', new apigateway.LambdaIntegration(quicksightEmbedHandler));

    // MCP Server endpoints
    const mcpResource = this.api.root.addResource('mcp');
    const mcpToolsResource = mcpResource.addResource('v1').addResource('tools');
    const mcpListResource = mcpToolsResource.addResource('list');
    const mcpCallResource = mcpToolsResource.addResource('call');
    const mcpHealthResource = mcpResource.addResource('health');
    
    mcpListResource.addMethod('POST', new apigateway.LambdaIntegration(mcpServerHandler));
    mcpCallResource.addMethod('POST', new apigateway.LambdaIntegration(mcpServerHandler));
    mcpHealthResource.addMethod('GET', new apigateway.LambdaIntegration(mcpServerHandler));

    // Output the role ARN
    new cdk.CfnOutput(this, 'LambdaExecutionRoleArn', {
      value: this.lambdaExecutionRole.roleArn,
      description: 'IAM role ARN for Lambda functions',
    });

    // Output MCP Server endpoint (base URL for QuickSuite MCP Action registration)
    new cdk.CfnOutput(this, 'McpServerEndpoint', {
      value: `${this.api.url}mcp`,
      description: 'MCP Server base endpoint for QuickSuite Chat Agent (QuickSuite will append /v1/tools/list and /v1/tools/call)',
    });
  }
}
