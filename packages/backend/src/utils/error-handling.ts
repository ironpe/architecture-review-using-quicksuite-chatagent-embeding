import { APIGatewayProxyResult } from 'aws-lambda';

/**
 * Error message constants
 */
export const ERROR_MESSAGES = {
  // Validation errors
  INVALID_FILE_TYPE: 'File type not supported. Please upload PPT, PDF, Word, PNG, or JPG files.',
  FILE_TOO_LARGE: 'File size exceeds 50MB limit.',
  MISSING_BODY: 'Request body is required',
  MISSING_FIELDS: 'Missing required fields',
  INVALID_PAGE: 'Page number must be greater than 0',
  INVALID_LIMIT: 'Limit must be between 1 and 100',
  MISSING_QUERY: 'Search query parameter is required',
  MISSING_DOCUMENT_ID: 'Document ID is required',

  // Upload errors
  UPLOAD_FAILED: 'Failed to upload file. Please try again.',
  METADATA_SAVE_FAILED: 'Failed to save document metadata.',

  // Retrieval errors
  DOCUMENT_NOT_FOUND: 'Document not found.',
  DOCUMENTS_RETRIEVAL_FAILED: 'Unable to retrieve documents. Please try again later.',
  DOCUMENT_RETRIEVAL_FAILED: 'Unable to retrieve document. Please try again later.',
  SEARCH_FAILED: 'Unable to search documents. Please try again later.',

  // S3 errors
  S3_ACCESS_ERROR: 'Unable to access document. Please try again later.',

  // DynamoDB errors
  DYNAMODB_ERROR: 'Database operation failed. Please try again later.',

  // Generic errors
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again later.',
  NETWORK_ERROR: 'Network connection error. Please check your connection and try again.',
};

/**
 * Creates a standardized error response
 * @param statusCode - HTTP status code
 * @param errorType - Error type/category
 * @param message - Error message
 * @returns API Gateway proxy result
 */
export function createErrorResponse(
  statusCode: number,
  errorType: string,
  message: string
): APIGatewayProxyResult {
  // Log error details
  console.error(`[${errorType}] ${message}`, {
    statusCode,
    timestamp: new Date().toISOString(),
  });

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      error: errorType,
      message,
    }),
  };
}

/**
 * Creates a success response
 * @param statusCode - HTTP status code (default: 200)
 * @param data - Response data
 * @returns API Gateway proxy result
 */
export function createSuccessResponse(
  data: any,
  statusCode: number = 200
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(data),
  };
}

/**
 * Logs error with context information
 * @param error - Error object
 * @param context - Additional context information
 */
export function logError(error: Error, context?: Record<string, any>): void {
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    timestamp: new Date().toISOString(),
    ...context,
  });
}

/**
 * Determines if an error is a DynamoDB error
 * @param error - Error object
 * @returns true if DynamoDB error
 */
export function isDynamoDBError(error: any): boolean {
  return (
    error.name?.includes('DynamoDB') ||
    error.name?.includes('ResourceNotFoundException') ||
    error.name?.includes('ProvisionedThroughputExceededException') ||
    error.name?.includes('ConditionalCheckFailedException')
  );
}

/**
 * Determines if an error is an S3 error
 * @param error - Error object
 * @returns true if S3 error
 */
export function isS3Error(error: any): boolean {
  return (
    error.name?.includes('S3') ||
    error.name?.includes('NoSuchKey') ||
    error.name?.includes('AccessDenied')
  );
}

/**
 * Gets user-friendly error message based on error type
 * @param error - Error object
 * @returns User-friendly error message
 */
export function getUserFriendlyErrorMessage(error: any): string {
  if (isDynamoDBError(error)) {
    return ERROR_MESSAGES.DYNAMODB_ERROR;
  }

  if (isS3Error(error)) {
    return ERROR_MESSAGES.S3_ACCESS_ERROR;
  }

  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  return ERROR_MESSAGES.INTERNAL_ERROR;
}
