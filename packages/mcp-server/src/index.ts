import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// AWS Clients
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

const TABLE_NAME = process.env.TABLE_NAME || 'architecture-review-documents';
const BUCKET_NAME = process.env.BUCKET_NAME || 'architecture-review-files-YOUR_ACCOUNT_ID-YOUR_REGION';

// MCP Server
const server = new Server(
  {
    name: 'architecture-review-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const tools: Tool[] = [
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
          description: '저장할 파일명 (선택, 기본값: review.txt)',
        },
      },
      required: ['documentId', 'reviewContent'],
    },
  },
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_document': {
        const { documentId } = args as { documentId: string };
        
        const command = new GetCommand({
          TableName: TABLE_NAME,
          Key: { documentId },
        });
        
        const result = await docClient.send(command);
        
        if (!result.Item) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Document not found' }),
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.Item, null, 2),
            },
          ],
        };
      }

      case 'list_documents': {
        const { limit = 20 } = args as { limit?: number };
        
        const command = new ScanCommand({
          TableName: TABLE_NAME,
          Limit: limit,
        });
        
        const result = await docClient.send(command);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                documents: result.Items || [],
                count: result.Count || 0,
              }, null, 2),
            },
          ],
        };
      }

      case 'update_review': {
        const { documentId, reviewer, architectureOverview, reviewDate, reviewCompleted } = args as {
          documentId: string;
          reviewer?: string;
          architectureOverview?: string;
          reviewDate?: string;
          reviewCompleted?: boolean;
        };

        // Build update expression
        const updateExpressions: string[] = [];
        const expressionAttributeNames: Record<string, string> = {};
        const expressionAttributeValues: Record<string, any> = {};

        if (reviewer !== undefined) {
          updateExpressions.push('#reviewer = :reviewer');
          expressionAttributeNames['#reviewer'] = 'reviewer';
          expressionAttributeValues[':reviewer'] = reviewer;
        }

        if (architectureOverview !== undefined) {
          updateExpressions.push('#architectureOverview = :architectureOverview');
          expressionAttributeNames['#architectureOverview'] = 'architectureOverview';
          expressionAttributeValues[':architectureOverview'] = architectureOverview;
        }

        if (reviewDate !== undefined) {
          updateExpressions.push('#reviewDate = :reviewDate');
          expressionAttributeNames['#reviewDate'] = 'reviewDate';
          expressionAttributeValues[':reviewDate'] = reviewDate;
        }

        if (reviewCompleted !== undefined) {
          updateExpressions.push('#reviewCompleted = :reviewCompleted');
          expressionAttributeNames['#reviewCompleted'] = 'reviewCompleted';
          expressionAttributeValues[':reviewCompleted'] = reviewCompleted;
        }

        if (updateExpressions.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'No fields to update' }),
              },
            ],
          };
        }

        const command = new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { documentId },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        });

        const result = await docClient.send(command);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Review updated successfully',
                document: result.Attributes,
              }, null, 2),
            },
          ],
        };
      }

      case 'save_review_to_s3': {
        const { documentId, reviewContent, filename = 'review.txt' } = args as {
          documentId: string;
          reviewContent: string;
          filename?: string;
        };

        const s3Key = `reviews/${documentId}/${filename}`;
        
        const command = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
          Body: reviewContent,
          ContentType: 'text/plain; charset=utf-8',
        });

        await s3Client.send(command);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Review saved to S3 successfully',
                s3Key,
                bucket: BUCKET_NAME,
              }, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: `Unknown tool: ${name}` }),
            },
          ],
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
        },
      ],
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Architecture Review MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
