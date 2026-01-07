import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { EXTENSION_TO_MIME, SupportedFileExtension } from '../types';

const s3Client = new S3Client({ region: process.env.AWS_REGION });

/**
 * Generates S3 key with format: timestamp-uuid-filename
 * @param documentId - Unique document identifier (UUID)
 * @param filename - Original filename
 * @returns S3 object key
 */
export function generateS3Key(documentId: string, filename: string): string {
  const timestamp = Date.now();
  return `${timestamp}-${documentId}-${filename}`;
}

/**
 * Gets content type (MIME type) for a file extension
 * @param filename - Filename with extension
 * @returns MIME type string
 */
export function getContentType(filename: string): string {
  const extension = filename.toLowerCase().match(/\.[^.]+$/)?.[0] as SupportedFileExtension;
  
  if (extension && extension in EXTENSION_TO_MIME) {
    return EXTENSION_TO_MIME[extension];
  }
  
  // Default to binary if extension not recognized
  return 'application/octet-stream';
}

/**
 * Generates a pre-signed URL for S3 object access
 * @param bucketName - S3 bucket name
 * @param key - S3 object key
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns Pre-signed URL
 */
export async function generatePresignedUrl(
  bucketName: string,
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Extracts timestamp from S3 key
 * @param s3Key - S3 object key in format timestamp-uuid-filename
 * @returns Timestamp as number
 */
export function extractTimestampFromKey(s3Key: string): number {
  const parts = s3Key.split('-');
  if (parts.length >= 1) {
    const timestamp = parseInt(parts[0], 10);
    if (!isNaN(timestamp)) {
      return timestamp;
    }
  }
  return Date.now();
}

/**
 * Extracts filename from S3 key
 * @param s3Key - S3 object key in format timestamp-uuid-filename
 * @returns Original filename
 */
export function extractFilenameFromKey(s3Key: string): string {
  // Format: timestamp-uuid-filename
  // UUID is 36 characters with 4 hyphens
  const parts = s3Key.split('-');
  if (parts.length >= 6) {
    // Skip timestamp (1 part) and UUID (5 parts), rest is filename
    return parts.slice(6).join('-');
  }
  return s3Key;
}
