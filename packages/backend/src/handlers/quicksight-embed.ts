import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QuickSightClient, GenerateEmbedUrlForRegisteredUserCommand } from '@aws-sdk/client-quicksight';
import { QuickSightEmbedResponse } from '../types/quicksight';

const quicksightClient = new QuickSightClient({ region: process.env.AWS_REGION || 'us-east-1' });

const QUICKSIGHT_ACCOUNT_ID = process.env.QUICKSIGHT_ACCOUNT_ID || process.env.AWS_ACCOUNT_ID;
const QUICKSIGHT_AGENT_ARN = process.env.QUICKSIGHT_AGENT_ARN;
const QUICKSIGHT_NAMESPACE = process.env.QUICKSIGHT_NAMESPACE || 'default';
const QUICKSIGHT_USER_NAME = process.env.QUICKSIGHT_USER_NAME || 'qsadmin';

/**
 * Lambda handler for generating QuickSight embed URLs using Registered User Embedding
 */
export async function handler(
  _event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // Validate environment variables
    if (!QUICKSIGHT_ACCOUNT_ID || !QUICKSIGHT_AGENT_ARN) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Configuration Error',
          message: 'QuickSight configuration is missing',
        }),
      };
    }

    // Extract Agent ID from ARN
    const agentId = QUICKSIGHT_AGENT_ARN.split('/').pop();
    
    // User ARN for registered user
    const userArn = `arn:aws:quicksight:${process.env.AWS_REGION}:${QUICKSIGHT_ACCOUNT_ID}:user/${QUICKSIGHT_NAMESPACE}/${QUICKSIGHT_USER_NAME}`;

    console.log('Generating QuickChat embed URL for user:', userArn);
    console.log('Agent ID:', agentId);

    // Generate embed URL with QuickChat experience
    const command = new GenerateEmbedUrlForRegisteredUserCommand({
      AwsAccountId: QUICKSIGHT_ACCOUNT_ID,
      UserArn: userArn,
      ExperienceConfiguration: {
        QuickChat: {
          InitialAgentId: agentId,
        },
      },
      SessionLifetimeInMinutes: 600,
      AllowedDomains: [
        'http://localhost:5173',
        'http://localhost:3000',
      ],
    });

    const response = await quicksightClient.send(command);

    if (!response.EmbedUrl) {
      throw new Error('Failed to generate embed URL');
    }

    console.log('Generated embed URL successfully');

    const embedResponse: QuickSightEmbedResponse = {
      embedUrl: response.EmbedUrl,
      status: response.Status || 200,
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(embedResponse),
    };
  } catch (error: any) {
    console.error('Error generating QuickSight embed URL:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message || 'Failed to generate QuickSight embed URL',
      }),
    };
  }
}

