import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { SaveMetadataRequest, DocumentMetadata } from '../types';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: process.env.AWS_REGION });

const TABLE_NAME = process.env.TABLE_NAME!;
const BUCKET_NAME = process.env.BUCKET_NAME!;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 100;

/**
 * Implements exponential backoff retry logic
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < retries) {
        // Exponential backoff: 100ms, 200ms, 400ms
        const backoffTime = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${retries} after ${backoffTime}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
  }

  throw lastError;
}

/**
 * Lambda handler for saving document metadata to DynamoDB
 * Implements retry logic with exponential backoff and S3 cleanup on failure
 */
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  let s3Key: string | undefined;

  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Bad Request',
          message: 'Request body is required',
        }),
      };
    }

    const request: SaveMetadataRequest = JSON.parse(event.body);
    const { documentId, filename, fileType, fileSize, s3Key: key, requester } = request;

    // Store s3Key for potential cleanup
    s3Key = key;

    // Validate required fields
    if (!documentId || !filename || !fileType || fileSize === undefined || !s3Key) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Bad Request',
          message: 'Missing required fields: documentId, filename, fileType, fileSize, s3Key',
        }),
      };
    }

    // Prepare metadata
    const uploadTimestamp = Date.now();
    const metadata: DocumentMetadata = {
      documentId,
      filename,
      fileType,
      fileSize,
      s3Key,
      uploadTimestamp,
      uploadDate: new Date(uploadTimestamp).toISOString(),
      requester: requester || 'Unknown',
      reviewCompleted: false,
    };

    // Save to DynamoDB with retry logic
    try {
      await retryWithBackoff(async () => {
        const command = new PutCommand({
          TableName: TABLE_NAME,
          Item: metadata,
        });
        await docClient.send(command);
      });

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'Metadata saved successfully',
          documentId,
        }),
      };
    } catch (dynamoError) {
      console.error('Failed to save metadata after retries:', dynamoError);

      // Clean up S3 file on complete failure
      try {
        console.log(`Cleaning up S3 object: ${s3Key}`);
        const deleteCommand = new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
        });
        await s3Client.send(deleteCommand);
        console.log('S3 cleanup successful');
      } catch (s3Error) {
        console.error('Failed to clean up S3 object:', s3Error);
      }

      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Internal Server Error',
          message: 'Failed to save document metadata.',
        }),
      };
    }
  } catch (error) {
    console.error('Error saving metadata:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to save document metadata.',
      }),
    };
  }
}
