/**
 * Shared type definitions for the frontend
 * These should match the backend types
 */

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

export interface GetReviewResponse {
  documentId: string;
  reviewContent: string;
  s3Key: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
}
