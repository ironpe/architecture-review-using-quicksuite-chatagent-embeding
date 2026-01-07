import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const BUCKET_NAME = process.env.BUCKET_NAME!;
const TABLE_NAME = process.env.TABLE_NAME!;

/**
 * Lambda handler for getting review content from S3
 */
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const documentId = event.pathParameters?.documentId;

    if (!documentId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Bad Request',
          message: 'documentId is required',
        }),
      };
    }

    // Get document metadata to find review location
    const docCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: { documentId },
    });

    const docResult = await docClient.send(docCommand);

    if (!docResult.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Not Found',
          message: 'Document not found',
        }),
      };
    }

    // Use reviewResultLocation if available, otherwise default path
    const s3Key = docResult.Item.reviewResultLocation || `reviews/${documentId}/review.txt`;
    
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      });

      const response = await s3Client.send(command);
      const reviewContent = await response.Body?.transformToString('utf-8');

      if (!reviewContent) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            error: 'Not Found',
            message: 'Review not found',
          }),
        };
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          documentId,
          reviewContent,
          s3Key,
        }),
      };
    } catch (s3Error: any) {
      if (s3Error.name === 'NoSuchKey') {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            error: 'Not Found',
            message: 'Review not found for this document',
          }),
        };
      }
      throw s3Error;
    }
  } catch (error) {
    console.error('Error getting review:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to get review',
      }),
    };
  }
}
