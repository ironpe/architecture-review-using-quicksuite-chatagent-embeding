import axios, { AxiosError } from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';
import {
  UploadUrlRequest,
  UploadUrlResponse,
  SaveMetadataRequest,
  ListDocumentsResponse,
  SearchDocumentsResponse,
  GetDocumentResponse,
  GetReviewResponse,
  ErrorResponse,
} from '../types';

/**
 * API client for backend communication
 */

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include Cognito token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login on unauthorized
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Error handler for API requests
 */
function handleApiError(error: AxiosError<ErrorResponse>): never {
  if (error.response?.data) {
    throw new Error(error.response.data.message || 'An error occurred');
  }
  throw new Error(error.message || 'Network error');
}

/**
 * Request upload URL from backend
 */
export async function requestUploadUrl(
  request: UploadUrlRequest
): Promise<UploadUrlResponse> {
  try {
    const response = await apiClient.post<UploadUrlResponse>(
      API_ENDPOINTS.UPLOAD_URL,
      request
    );
    return response.data;
  } catch (error) {
    return handleApiError(error as AxiosError<ErrorResponse>);
  }
}

/**
 * Upload file to S3 using pre-signed URL
 */
export async function uploadFileToS3(
  url: string,
  file: File,
  contentType: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  try {
    await axios.put(url, file, {
      headers: {
        'Content-Type': contentType,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(progress);
        }
      },
    });
  } catch (error) {
    throw new Error('Failed to upload file to S3');
  }
}

/**
 * Save document metadata to backend
 */
export async function saveMetadata(
  request: SaveMetadataRequest
): Promise<void> {
  try {
    await apiClient.post(API_ENDPOINTS.METADATA, request);
  } catch (error) {
    return handleApiError(error as AxiosError<ErrorResponse>);
  }
}

/**
 * List documents with pagination
 */
export async function listDocuments(
  page: number = 1,
  limit: number = 20
): Promise<ListDocumentsResponse> {
  try {
    const response = await apiClient.get<ListDocumentsResponse>(
      API_ENDPOINTS.DOCUMENTS,
      {
        params: { page, limit },
      }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error as AxiosError<ErrorResponse>);
  }
}

/**
 * Search documents by filename
 */
export async function searchDocuments(
  query: string
): Promise<SearchDocumentsResponse> {
  try {
    const response = await apiClient.get<SearchDocumentsResponse>(
      API_ENDPOINTS.SEARCH,
      {
        params: { query },
      }
    );
    return response.data;
  } catch (error) {
    return handleApiError(error as AxiosError<ErrorResponse>);
  }
}

/**
 * Get document by ID
 */
export async function getDocument(
  documentId: string
): Promise<GetDocumentResponse> {
  try {
    const response = await apiClient.get<GetDocumentResponse>(
      API_ENDPOINTS.DOCUMENT_BY_ID(documentId)
    );
    return response.data;
  } catch (error) {
    return handleApiError(error as AxiosError<ErrorResponse>);
  }
}

/**
 * Delete document by ID
 */
export async function deleteDocument(
  documentId: string
): Promise<void> {
  try {
    await apiClient.delete(API_ENDPOINTS.DOCUMENT_BY_ID(documentId));
  } catch (error) {
    return handleApiError(error as AxiosError<ErrorResponse>);
  }
}

/**
 * Get review content by document ID
 */
export async function getReview(
  documentId: string
): Promise<GetReviewResponse> {
  try {
    const response = await apiClient.get<GetReviewResponse>(
      `/documents/review/${documentId}`
    );
    return response.data;
  } catch (error) {
    return handleApiError(error as AxiosError<ErrorResponse>);
  }
}
