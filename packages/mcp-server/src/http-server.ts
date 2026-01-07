import express from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const app = express();
app.use(express.json());

// AWS Clients
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

const TABLE_NAME = process.env.TABLE_NAME || 'architecture-review-documents';
const BUCKET_NAME = process.env.BUCKET_NAME || 'architecture-review-files-YOUR_ACCOUNT_ID-YOUR_REGION';

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// MCP Protocol endpoints
app.get('/sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send initial connection message
  res.write('event: endpoint\n');
  res.write(`data: ${JSON.stringify({ version: '2025-03-26' })}\n\n`);
  
  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 30000);
  
  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

// List tools
app.post('/v1/tools/list', async (req, res) => {
  try {
    const tools = [
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

    res.json({ tools });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list tools' });
  }
});

// Call tool
app.post('/v1/tools/call', async (req, res) => {
  const { name, arguments: args } = req.body;

  try {
    switch (name) {
      case 'get_document': {
        const { documentId } = args;
        
        const command = new GetCommand({
          TableName: TABLE_NAME,
          Key: { documentId },
        });
        
        const result = await docClient.send(command);
        
        if (!result.Item) {
          return res.json({
            content: [{ type: 'text', text: JSON.stringify({ error: 'Document not found' }) }],
          });
        }
        
        return res.json({
          content: [{ type: 'text', text: JSON.stringify(result.Item, null, 2) }],
        });
      }

      case 'list_documents': {
        const { limit = 20 } = args;
        
        const command = new ScanCommand({
          TableName: TABLE_NAME,
          Limit: limit,
        });
        
        const result = await docClient.send(command);
        
        return res.json({
          content: [{
            type: 'text',
            text: JSON.stringify({
              documents: result.Items || [],
              count: result.Count || 0,
            }, null, 2),
          }],
        });
      }

      case 'update_review': {
        const { documentId, reviewer, architectureOverview, reviewDate, reviewCompleted } = args;

        const updateExpressions: string[] = [];
        const expressionAttributeNames: Record<string, string> = {};
        const expressionAttributeValues: Record<string, any> = {};

        if (reviewer) {
          updateExpressions.push('#reviewer = :reviewer');
          expressionAttributeNames['#reviewer'] = 'reviewer';
          expressionAttributeValues[':reviewer'] = reviewer;
        }

        if (architectureOverview) {
          updateExpressions.push('#architectureOverview = :architectureOverview');
          expressionAttributeNames['#architectureOverview'] = 'architectureOverview';
          expressionAttributeValues[':architectureOverview'] = architectureOverview;
        }

        if (reviewDate) {
          updateExpressions.push('#reviewDate = :reviewDate');
          expressionAttributeNames['#reviewDate'] = 'reviewDate';
          expressionAttributeValues[':reviewDate'] = reviewDate;
        }

        if (reviewCompleted !== undefined) {
          updateExpressions.push('#reviewCompleted = :reviewCompleted');
          expressionAttributeNames['#reviewCompleted'] = 'reviewCompleted';
          expressionAttributeValues[':reviewCompleted'] = reviewCompleted;
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

        return res.json({
          content: [{
            type: 'text',
            text: JSON.stringify({
              message: 'Review updated successfully',
              document: result.Attributes,
            }, null, 2),
          }],
        });
      }

      case 'save_review_to_s3': {
        const { documentId, reviewContent, filename = 'review.txt' } = args;

        const s3Key = `reviews/${documentId}/${filename}`;
        
        const command = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
          Body: reviewContent,
          ContentType: 'text/plain; charset=utf-8',
        });

        await s3Client.send(command);

        return res.json({
          content: [{
            type: 'text',
            text: JSON.stringify({
              message: 'Review saved to S3 successfully',
              s3Key,
              bucket: BUCKET_NAME,
            }, null, 2),
          }],
        });
      }

      default:
        return res.status(404).json({
          content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
        });
    }
  } catch (error) {
    console.error('Tool execution error:', error);
    res.status(500).json({
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      }],
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'architecture-review-mcp' });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`MCP Server running on http://localhost:${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`Tools endpoint: http://localhost:${PORT}/v1/tools/call`);
});
