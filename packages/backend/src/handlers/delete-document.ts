import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: process.env.AWS_REGION });

const TABLE_NAME = process.env.TABLE_NAME!;
const BUCKET_NAME = process.env.BUCKET_NAME!;

/**
 * Lambda handler for deleting documents
 * Deletes both S3 file and DynamoDB record
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

    // Get document metadata to find S3 key
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: { documentId },
    });

    const getResult = await docClient.send(getCommand);

    if (!getResult.Item) {
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

    const s3Key = getResult.Item.s3Key;

    // Delete from S3
    try {
      const s3DeleteCommand = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      });
      await s3Client.send(s3DeleteCommand);
      console.log('S3 file deleted:', s3Key);
    } catch (s3Error) {
      console.error('Error deleting S3 file:', s3Error);
      // Continue to delete DynamoDB record even if S3 deletion fails
    }

    // Delete from DynamoDB
    const deleteCommand = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { documentId },
    });

    await docClient.send(deleteCommand);
    console.log('DynamoDB record deleted:', documentId);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Document deleted successfully',
        documentId,
      }),
    };
  } catch (error) {
    console.error('Error deleting document:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to delete document',
      }),
    };
  }
}
