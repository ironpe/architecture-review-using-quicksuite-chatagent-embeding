import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './upload-url';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({})),
  PutObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(() => Promise.resolve('https://mock-presigned-url.com')),
}));

// Set environment variables
process.env.BUCKET_NAME = 'test-bucket';
process.env.AWS_REGION = 'us-east-1';

describe('Upload URL Handler', () => {
  let mockEvent: Partial<APIGatewayProxyEvent>;

  beforeEach(() => {
    mockEvent = {
      body: null,
      headers: {},
      multiValueHeaders: {},
      httpMethod: 'POST',
      isBase64Encoded: false,
      path: '/documents/upload-url',
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: '',
    };
  });

  describe('Successful upload URL generation', () => {
    it('should generate upload URL for valid request', async () => {
      mockEvent.body = JSON.stringify({
        filename: 'test.pdf',
        fileType: 'application/pdf',
        fileSize: 1000000,
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('documentId');
      expect(body).toHaveProperty('uploadUrl');
      expect(body).toHaveProperty('fields');
      expect(body.uploadUrl).toBe('https://mock-presigned-url.com');
    });
  });

  describe('Validation failures', () => {
    it('should reject request with missing body', async () => {
      mockEvent.body = null;

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Bad Request');
      expect(body.message).toBe('Request body is required');
    });

    it('should reject request with missing required fields', async () => {
      mockEvent.body = JSON.stringify({
        filename: 'test.pdf',
        // Missing fileType and fileSize
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Bad Request');
      expect(body.message).toContain('Missing required fields');
    });

    it('should reject unsupported file type', async () => {
      mockEvent.body = JSON.stringify({
        filename: 'test.txt',
        fileType: 'text/plain',
        fileSize: 1000,
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Validation Error');
      expect(body.message).toContain('File type not supported');
    });

    it('should reject file size exceeding limit', async () => {
      mockEvent.body = JSON.stringify({
        filename: 'large.pdf',
        fileType: 'application/pdf',
        fileSize: 52428801, // 50MB + 1 byte
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Validation Error');
      expect(body.message).toContain('File size exceeds 50MB limit');
    });
  });

  describe('Error responses', () => {
    it('should return 500 for malformed JSON', async () => {
      mockEvent.body = 'invalid json {';

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Internal Server Error');
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers in response', async () => {
      mockEvent.body = JSON.stringify({
        filename: 'test.pdf',
        fileType: 'application/pdf',
        fileSize: 1000,
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.headers).toHaveProperty('Access-Control-Allow-Origin');
      expect(result.headers!['Access-Control-Allow-Origin']).toBe('*');
    });
  });
});
