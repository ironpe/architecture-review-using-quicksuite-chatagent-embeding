import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { SearchDocumentsResponse, DocumentMetadata } from '../types';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME!;

/**
 * Lambda handler for searching documents by filename
 * Performs case-insensitive search on filename field
 */
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // Get search query from query parameters
    const query = event.queryStringParameters?.query;

    if (!query) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Bad Request',
          message: 'Search query parameter is required',
        }),
      };
    }

    // Scan all documents from DynamoDB
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
    });

    const scanResult = await docClient.send(scanCommand);
    const allDocuments = (scanResult.Items || []) as DocumentMetadata[];

    // Filter documents by filename (case-insensitive)
    const lowerQuery = query.toLowerCase();
    const matchingDocuments = allDocuments.filter(doc => 
      doc.filename.toLowerCase().includes(lowerQuery)
    );

    // Sort by uploadTimestamp descending (newest first)
    matchingDocuments.sort((a, b) => b.uploadTimestamp - a.uploadTimestamp);

    // Prepare response
    const response: SearchDocumentsResponse = {
      documents: matchingDocuments,
      totalCount: matchingDocuments.length,
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
    console.error('Error searching documents:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'Unable to search documents. Please try again later.',
      }),
    };
  }
}
