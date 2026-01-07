import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ListDocumentsResponse, DocumentMetadata } from '../types';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME!;
const ITEMS_PER_PAGE = 20;

/**
 * Lambda handler for listing documents with pagination
 * Retrieves documents from DynamoDB, sorted by upload timestamp descending
 */
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // Parse query parameters
    const page = parseInt(event.queryStringParameters?.page || '1', 10);
    const limit = parseInt(event.queryStringParameters?.limit || String(ITEMS_PER_PAGE), 10);

    // Validate parameters
    if (page < 1) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Bad Request',
          message: 'Page number must be greater than 0',
        }),
      };
    }

    if (limit < 1 || limit > 100) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Bad Request',
          message: 'Limit must be between 1 and 100',
        }),
      };
    }

    // Scan all documents from DynamoDB
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
    });

    const scanResult = await docClient.send(scanCommand);
    const allDocuments = (scanResult.Items || []) as DocumentMetadata[];

    // Sort by uploadTimestamp descending (newest first)
    allDocuments.sort((a, b) => b.uploadTimestamp - a.uploadTimestamp);

    // Calculate pagination
    const totalCount = allDocuments.length;
    const totalPages = Math.ceil(totalCount / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    // Get documents for current page
    const documents = allDocuments.slice(startIndex, endIndex);

    // Prepare response
    const response: ListDocumentsResponse = {
      documents,
      totalCount,
      currentPage: page,
      totalPages,
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
    console.error('Error listing documents:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'Unable to retrieve documents. Please try again later.',
      }),
    };
  }
}
