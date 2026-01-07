import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { validateFile } from '../utils/validation';
import { UploadUrlRequest, UploadUrlResponse } from '../types';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BUCKET_NAME = process.env.BUCKET_NAME!;

/**
 * Lambda handler for generating pre-signed upload URLs
 * Validates file metadata and creates S3 pre-signed POST URL
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

    const request: UploadUrlRequest = JSON.parse(event.body);
    const { filename, fileType, fileSize } = request;

    // Validate required fields
    if (!filename || !fileType || fileSize === undefined) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Bad Request',
          message: 'Missing required fields: filename, fileType, fileSize',
        }),
      };
    }

    // Validate file
    const validation = validateFile(filename, fileSize);
    if (!validation.valid) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Validation Error',
          message: validation.error,
        }),
      };
    }

    // Generate unique document ID
    const documentId = randomUUID();

    // Generate S3 key with timestamp-uuid-filename format
    const timestamp = Date.now();
    const s3Key = `${timestamp}-${documentId}-${filename}`;

    // Create pre-signed URL for PUT operation
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    // Prepare response
    const response: UploadUrlResponse = {
      documentId,
      uploadUrl,
      fields: {
        key: s3Key,
        'Content-Type': fileType,
      },
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
    console.error('Error generating upload URL:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to generate upload URL. Please try again.',
      }),
    };
  }
}
