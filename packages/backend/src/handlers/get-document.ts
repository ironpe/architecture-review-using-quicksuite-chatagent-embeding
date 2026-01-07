import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { GetDocumentResponse, DocumentMetadata } from '../types';
import { generatePresignedUrl } from '../utils/s3-helpers';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME!;
const BUCKET_NAME = process.env.BUCKET_NAME!;

/**
 * Lambda handler for retrieving a single document
 * Fetches metadata from DynamoDB and generates pre-signed URL for S3 access
 */
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // Get document ID from path parameters
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
          message: 'Document ID is required',
        }),
      };
    }

    // Fetch metadata from DynamoDB
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        documentId,
      },
    });

    const result = await docClient.send(getCommand);

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Not Found',
          message: 'Document not found.',
        }),
      };
    }

    const metadata = result.Item as DocumentMetadata;

    // Generate pre-signed URL for S3 access (1 hour expiration)
    let presignedUrl: string;
    try {
      presignedUrl = await generatePresignedUrl(BUCKET_NAME, metadata.s3Key, 3600);
    } catch (s3Error) {
      console.error('Error generating pre-signed URL:', s3Error);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Internal Server Error',
          message: 'Unable to access document. Please try again later.',
        }),
      };
    }

    // Prepare response
    const response: GetDocumentResponse = {
      metadata,
      presignedUrl,
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error retrieving document:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'Unable to retrieve document. Please try again later.',
      }),
    };
  }
}
