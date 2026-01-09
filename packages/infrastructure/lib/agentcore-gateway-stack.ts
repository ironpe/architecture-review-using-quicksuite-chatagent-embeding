import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface AgentCoreGatewayStackProps extends cdk.StackProps {
  lambdaExecutionRole: iam.Role;
  documentsTableName: string;
  filesBucketName: string;
}

export class AgentCoreGatewayStack extends cdk.Stack {
  public readonly gateway: any; // bedrock.CfnGateway is not available in current CDK version
  public readonly gatewayUrl: string = '';

  constructor(scope: Construct, id: string, props: AgentCoreGatewayStackProps) {
    super(scope, id, props);

    // Cognito User Pool for AgentCore Gateway authentication
    const userPool = new cognito.UserPool(this, 'AgentCoreUserPool', {
      userPoolName: 'agentcore-gateway-pool',
      selfSignUpEnabled: false,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // App Client for Machine-to-Machine authentication
    const appClient = userPool.addClient('AgentCoreAppClient', {
      userPoolClientName: 'agentcore-m2m-client',
      generateSecret: true,
      authFlows: {
        userPassword: false,
        userSrp: false,
        custom: false,
      },
      oAuth: {
        flows: {
          clientCredentials: true,
        },
        scopes: [cognito.OAuthScope.COGNITO_ADMIN],
      },
    });

    // Lambda function for MCP tools (reuse existing)
    const mcpToolsLambda = lambda.Function.fromFunctionName(
      this,
      'McpToolsLambda',
      `ArchitectureReviewStack-McpServerHandler89A0C9C0-qqJwYOe88Yxw`
    );

    // MCP Schema for tools (commented out - for future use when CfnGateway is available)
    /*
    const mcpSchema = [
      {
        name: 'get_document',
        description: 'DynamoDB에서 문서 정보를 조회합니다',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: {
              type: 'string',
              description: '조회할 문서의 ID',
            },
          },
          required: ['documentId'],
        },
      },
      {
        name: 'list_documents',
        description: 'DynamoDB에서 모든 문서 목록을 조회합니다',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: '조회할 문서 수 (기본값: 20)',
            },
          },
        },
      },
      {
        name: 'update_review',
        description: '문서의 검토 정보를 업데이트합니다',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: {
              type: 'string',
              description: '업데이트할 문서의 ID',
            },
            reviewer: {
              type: 'string',
              description: '검토자 이름',
            },
            architectureOverview: {
              type: 'string',
              description: '아키텍처 개요',
            },
            reviewDate: {
              type: 'string',
              description: '검토 일자 (YYYY-MM-DD)',
            },
            reviewCompleted: {
              type: 'boolean',
              description: '검토 완료 여부',
            },
          },
          required: ['documentId'],
        },
      },
      {
        name: 'save_review_to_s3',
        description: '검토 결과를 텍스트 파일로 S3에 저장합니다',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: {
              type: 'string',
              description: '문서 ID',
            },
            reviewContent: {
              type: 'string',
              description: '검토 내용',
            },
            filename: {
              type: 'string',
              description: '저장할 파일명 (기본값: review.txt)',
            },
          },
          required: ['documentId', 'reviewContent'],
        },
      },
    ];
    */

    // IAM Role for AgentCore Gateway
    const gatewayRole = new iam.Role(this, 'AgentCoreGatewayRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      description: 'Role for AgentCore Gateway to invoke Lambda',
    });

    // Grant Lambda invoke permission
    mcpToolsLambda.grantInvoke(gatewayRole);

    // Create AgentCore Gateway
    // Note: CfnGateway is not available in current CDK version
    // This will be created manually or through CloudFormation template
    // Commenting out for now to allow build to succeed
    /*
    this.gateway = new bedrock.CfnGateway(this, 'AgentCoreGateway', {
      gatewayName: 'architecture-review-gateway',
      inboundFlowConfig: {
        identityProviderConfig: {
          cognitoConfig: {
            userPoolArn: userPool.userPoolArn,
            allowedClientIds: [appClient.userPoolClientId],
          },
        },
      },
      targets: [
        {
          targetName: 'architecture-review-tools',
          targetType: 'LAMBDA',
          lambdaTargetConfig: {
            lambdaArn: mcpToolsLambda.functionArn,
            inlineSchema: JSON.stringify(mcpSchema),
          },
        },
      ],
    });
    */

    // Outputs
    new cdk.CfnOutput(this, 'McpLambdaArn', {
      value: mcpToolsLambda.functionArn,
      description: 'MCP Tools Lambda ARN for manual Gateway setup',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'AppClientId', {
      value: appClient.userPoolClientId,
      description: 'Cognito App Client ID',
    });

    new cdk.CfnOutput(this, 'TokenUrl', {
      value: `https://${userPool.userPoolProviderName}.auth.${this.region}.amazoncognito.com/oauth2/token`,
      description: 'Cognito Token URL',
    });
  }
}
