import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { UpdateReviewRequest } from '../types';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME!;

/**
 * Lambda handler for updating review information
 */
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
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

    const request: UpdateReviewRequest = JSON.parse(event.body);
    const { documentId, reviewer, architectureOverview, reviewDate, reviewCompleted, reviewResultLocation } = request;

    // Validate required field
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

    // Check if document exists
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

    // Build update expression dynamically
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

    if (reviewResultLocation !== undefined) {
      updateExpressions.push('#reviewResultLocation = :reviewResultLocation');
      expressionAttributeNames['#reviewResultLocation'] = 'reviewResultLocation';
      expressionAttributeValues[':reviewResultLocation'] = reviewResultLocation;
    }

    if (updateExpressions.length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Bad Request',
          message: 'At least one field to update is required',
        }),
      };
    }

    // Update document
    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { documentId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const result = await docClient.send(updateCommand);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Review information updated successfully',
        document: result.Attributes,
      }),
    };
  } catch (error) {
    console.error('Error updating review information:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to update review information.',
      }),
    };
  }
}
