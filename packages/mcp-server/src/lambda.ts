import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: process.env.AWS_REGION });

const TABLE_NAME = process.env.TABLE_NAME!;
const BUCKET_NAME = process.env.BUCKET_NAME!;

export async function handler(event: any): Promise<any> {
  console.log('MCP Lambda invoked:', JSON.stringify(event, null, 2));

  try {
    // list_documents: 빈 객체 또는 limit만
    if (Object.keys(event).length === 0 || (event.limit !== undefined && !event.documentId)) {
      const { limit = 20 } = event;
      const result = await docClient.send(new ScanCommand({
        TableName: TABLE_NAME,
        Limit: limit,
      }));
      console.log('list_documents result:', result.Count, 'items');
      return { output: { documents: result.Items || [], count: result.Count || 0 } };
    }
    
    // generate_diagram: diagramType이 있으면
    if (event.diagramType !== undefined) {
      const { documentId, diagramType = 'quicksight-bi' } = event;
      
      if (!documentId) {
        return { output: { error: 'documentId is required for diagram generation' } };
      }
      
      const mermaidCode = diagramType === 'quicksight-bi' 
        ? generateQuickSightBIMermaid()
        : generateGenericMermaid();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const s3Key = `diagrams/${documentId}/architecture-${timestamp}.mmd`;
      
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: mermaidCode,
        ContentType: 'text/plain; charset=utf-8',
      }));
      
      console.log('generate_diagram success:', s3Key);
      return {
        output: {
          message: 'Mermaid diagram generated successfully',
          documentId,
          s3Key,
          bucket: BUCKET_NAME,
          editUrl: `https://mermaid.live/edit#base64:${Buffer.from(mermaidCode).toString('base64')}`,
        },
      };
    }
    
    // documentId가 있는 경우
    if (event.documentId) {
      // save_review_to_s3: reviewContent가 있으면
      if (event.reviewContent) {
        const { documentId, reviewContent, filename = 'review.md' } = event;
        const s3Key = `reviews/${documentId}/${filename}`;

        await s3Client.send(new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
          Body: reviewContent,
          ContentType: 'text/markdown; charset=utf-8',
        }));

        await docClient.send(new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { documentId },
          UpdateExpression: 'SET #reviewResultLocation = :location',
          ExpressionAttributeNames: { '#reviewResultLocation': 'reviewResultLocation' },
          ExpressionAttributeValues: { ':location': s3Key },
        }));

        console.log('save_review_to_s3 success:', s3Key);
        return { output: { message: 'Review saved to S3 and DynamoDB updated', s3Key, bucket: BUCKET_NAME } };
      }
      
      // update_review: reviewer 등이 있으면
      if (event.reviewer || event.architectureOverview || event.reviewCompleted !== undefined) {
        const { documentId, reviewer, architectureOverview, reviewCompleted } = event;
        const updates: string[] = [];
        const names: Record<string, string> = {};
        const values: Record<string, any> = {};

        if (reviewer) {
          updates.push('#reviewer = :reviewer');
          names['#reviewer'] = 'reviewer';
          values[':reviewer'] = reviewer;
        }
        if (architectureOverview) {
          updates.push('#architectureOverview = :architectureOverview');
          names['#architectureOverview'] = 'architectureOverview';
          values[':architectureOverview'] = architectureOverview;
        }
        if (reviewCompleted === true) {
          const now = new Date();
          const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
          const completeDate = `${kstTime.getFullYear()}-${String(kstTime.getMonth() + 1).padStart(2, '0')}-${String(kstTime.getDate()).padStart(2, '0')} ${String(kstTime.getHours()).padStart(2, '0')}:${String(kstTime.getMinutes()).padStart(2, '0')}`;
          
          updates.push('#completeDate = :completeDate');
          names['#completeDate'] = 'completeDate';
          values[':completeDate'] = completeDate;
        }
        if (reviewCompleted !== undefined) {
          updates.push('#reviewCompleted = :reviewCompleted');
          names['#reviewCompleted'] = 'reviewCompleted';
          values[':reviewCompleted'] = reviewCompleted;
        }

        const result = await docClient.send(new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { documentId },
          UpdateExpression: `SET ${updates.join(', ')}`,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ReturnValues: 'ALL_NEW',
        }));

        console.log('update_review success');
        return { output: { message: 'Review updated successfully', document: result.Attributes } };
      }
      
      // get_document: 그 외
      const result = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { documentId: event.documentId },
      }));
      console.log('get_document result:', result.Item ? 'found' : 'not found');
      return { output: result.Item || { error: 'Document not found' } };
    }

    console.log('Invalid request format:', event);
    return { output: { error: 'Invalid request format', received: event } };
  } catch (error) {
    console.error('Error:', error);
    return { output: { error: error instanceof Error ? error.message : 'Unknown error' } };
  }
}

function generateQuickSightBIMermaid(): string {
  return `graph TB
    subgraph auth["🔐 Authentication"]
        okta[Okta SSO]
        iam[IAM Federation]
    end
    
    subgraph pax["☁️ PAX Environment"]
        lambda1[Lambda]
        athena1[Athena]
        qs1[QuickSight]
    end
    
    subgraph cgo["☁️ CGO Environment"]
        lambda2[Lambda]
        athena2[Athena]
        qs2[QuickSight]
    end
    
    subgraph erp["☁️ ERP Environment"]
        lambda3[Lambda]
        athena3[Athena]
        qs3[QuickSight]
    end
    
    subgraph data["💾 Data Layer"]
        redshift[(Redshift)]
        s3[(S3 Data Lake)]
    end
    
    okta --> iam
    iam --> qs1 & qs2 & qs3
    lambda1 & lambda2 & lambda3 --> athena1 & athena2 & athena3
    athena1 & athena2 & athena3 --> redshift
    redshift --> s3
    
    style okta fill:#FF9900
    style iam fill:#DD344C
    style qs1 fill:#8C4FFF
    style qs2 fill:#8C4FFF
    style qs3 fill:#8C4FFF
    style redshift fill:#3F8624
    style s3 fill:#569A31
`;
}

function generateGenericMermaid(): string {
  return `graph TB
    users[Users] --> alb[Load Balancer]
    alb --> lambda[Lambda]
    lambda --> rds[(Database)]
    lambda --> s3[(Storage)]
    
    style lambda fill:#FF9900
    style rds fill:#3F8624
    style s3 fill:#569A31
`;
}
