/**
 * API configuration
 */

// API base URL - should be set via environment variable in production
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// API endpoints
export const API_ENDPOINTS = {
  UPLOAD_URL: '/documents/upload-url',
  METADATA: '/documents/metadata',
  DOCUMENTS: '/documents',
  SEARCH: '/documents/search',
  DOCUMENT_BY_ID: (id: string) => `/documents/${id}`,
};
