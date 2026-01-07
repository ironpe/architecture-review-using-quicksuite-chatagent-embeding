import { SUPPORTED_EXTENSIONS, MAX_FILE_SIZE_BYTES } from '../types';

/**
 * Validates if a file extension is supported
 * @param filename - The filename to validate
 * @returns true if the extension is supported, false otherwise
 */
export function validateFileExtension(filename: string): boolean {
  if (!filename || typeof filename !== 'string') {
    return false;
  }

  const lowerFilename = filename.toLowerCase();
  
  return SUPPORTED_EXTENSIONS.some(ext => 
    lowerFilename.endsWith(ext.toLowerCase())
  );
}

/**
 * Validates if a file size is within the allowed limit
 * @param fileSize - The file size in bytes
 * @returns true if the file size is valid, false otherwise
 */
export function validateFileSize(fileSize: number): boolean {
  if (typeof fileSize !== 'number' || fileSize < 0) {
    return false;
  }

  return fileSize <= MAX_FILE_SIZE_BYTES;
}

/**
 * Extracts the file extension from a filename
 * @param filename - The filename to extract extension from
 * @returns The file extension (including the dot) or empty string if none found
 */
export function getFileExtension(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return '';
  }

  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return '';
  }

  return filename.substring(lastDotIndex).toLowerCase();
}

/**
 * Validates both file extension and size
 * @param filename - The filename to validate
 * @param fileSize - The file size in bytes
 * @returns Object with validation result and error message if invalid
 */
export function validateFile(filename: string, fileSize: number): { 
  valid: boolean; 
  error?: string 
} {
  if (!validateFileExtension(filename)) {
    return {
      valid: false,
      error: 'File type not supported. Please upload PDF or image files (PNG, JPG, JPEG).'
    };
  }

  if (!validateFileSize(fileSize)) {
    return {
      valid: false,
      error: 'File size exceeds 50MB limit.'
    };
  }

  return { valid: true };
}
