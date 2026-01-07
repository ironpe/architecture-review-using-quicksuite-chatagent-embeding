/**
 * File validation utilities (client-side)
 * These should match the backend validation logic
 */

export const SUPPORTED_EXTENSIONS = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
];

export const MAX_FILE_SIZE_BYTES = 52428800; // 50MB

/**
 * Validates if a file extension is supported
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
 */
export function validateFileSize(fileSize: number): boolean {
  if (typeof fileSize !== 'number' || fileSize < 0) {
    return false;
  }

  return fileSize <= MAX_FILE_SIZE_BYTES;
}

/**
 * Validates both file extension and size
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

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Gets file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) return '';
  return filename.substring(lastDotIndex).toLowerCase();
}

/**
 * Gets file type category for UI rendering
 */
export function getFileTypeCategory(filename: string): string {
  const ext = getFileExtension(filename);
  
  if (['.png', '.jpg', '.jpeg'].includes(ext)) return 'image';
  if (ext === '.pdf') return 'pdf';
  
  return 'unknown';
}
