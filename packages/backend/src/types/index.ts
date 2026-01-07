// Shared type definitions for the backend

// Supported file extensions (PDF and Images only)
export type SupportedFileExtension = 
  | '.pdf' 
  | '.png' 
  | '.jpg'
  | '.jpeg';

// MIME types for supported file formats
export type SupportedMimeType =
  | 'application/pdf'                                  // .pdf
  | 'image/png'                                        // .png
  | 'image/jpeg';                                      // .jpg, .jpeg

// File type categories for UI rendering
export type FileTypeCategory = 'image' | 'pdf';

// Mapping of extensions to MIME types
export const EXTENSION_TO_MIME: Record<SupportedFileExtension, SupportedMimeType> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

// Mapping of extensions to file type categories
export const EXTENSION_TO_CATEGORY: Record<SupportedFileExtension, FileTypeCategory> = {
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.pdf': 'pdf',
};

// Constants for validation
export const SUPPORTED_EXTENSIONS: SupportedFileExtension[] = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
];

export const MAX_FILE_SIZE_BYTES = 52428800; // 50MB in bytes

export interface DocumentMetadata {
  documentId: string;
  filename: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  uploadTimestamp: number;
  uploadDate: string;
  // 아키텍처 검토 관련 필드
  requester?: string;           // 요청자
  reviewer?: string;            // 검토자
  architectureOverview?: string; // 아키텍처 개요
  reviewDate?: string;          // 검토 일자 (사용자 지정)
  completeDate?: string;        // 검토 완료 일시 (자동 생성)
  reviewCompleted: boolean;     // 검토 완료 여부
  reviewResultLocation?: string; // 검토 결과 S3 위치
}

export interface UploadUrlRequest {
  filename: string;
  fileType: string;
  fileSize: number;
  requester?: string;           // 요청자 (선택)
}

export interface UploadUrlResponse {
  documentId: string;
  uploadUrl: string;
  fields: Record<string, string>;
}

export interface SaveMetadataRequest {
  documentId: string;
  filename: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  requester?: string;           // 요청자 (선택)
}

export interface UpdateReviewRequest {
  documentId: string;
  reviewer?: string;
  architectureOverview?: string;
  reviewDate?: string;
  completeDate?: string;
  reviewCompleted?: boolean;
  reviewResultLocation?: string;
}

export interface ListDocumentsResponse {
  documents: DocumentMetadata[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export interface SearchDocumentsResponse {
  documents: DocumentMetadata[];
  totalCount: number;
}

export interface GetDocumentResponse {
  metadata: DocumentMetadata;
  presignedUrl: string;
}

// Error response type
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

// API response wrapper for consistent error handling
export type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: ErrorResponse };
