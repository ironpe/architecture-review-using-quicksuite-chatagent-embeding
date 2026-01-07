import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Pagination,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
} from '@mui/material';
import { Search as SearchIcon, Visibility, Delete as DeleteIcon, Description as ReviewIcon } from '@mui/icons-material';
import { listDocuments, searchDocuments, deleteDocument, getReview } from '../services/api';
import { DocumentMetadata } from '../types';
import { formatDate, formatDateShort } from '../utils/date';
import { formatFileSize } from '../utils/validation';

function DocumentListPage() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentMetadata | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewContent, setReviewContent] = useState<string>('');
  const [loadingReview, setLoadingReview] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadDocuments();
  }, [currentPage]);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listDocuments(currentPage, 20);
      setDocuments(response.documents);
      setTotalPages(response.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      loadDocuments();
      return;
    }

    setLoading(true);
    setError(null);
    setIsSearching(true);
    try {
      const response = await searchDocuments(searchQuery);
      setDocuments(response.documents);
      setTotalPages(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    setCurrentPage(1);
    loadDocuments();
  };

  const handleDeleteClick = (doc: DocumentMetadata, e: React.MouseEvent) => {
    e.stopPropagation();
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    setDeleting(true);
    try {
      await deleteDocument(documentToDelete.documentId);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
      // Reload documents
      if (isSearching) {
        handleSearch();
      } else {
        loadDocuments();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서 삭제에 실패했습니다');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  const handleReviewClick = async (doc: DocumentMetadata, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!doc.reviewCompleted) {
      setError('검토가 완료되지 않은 문서입니다');
      return;
    }

    setLoadingReview(true);
    setReviewDialogOpen(true);
    setReviewContent('');

    try {
      const response = await getReview(doc.documentId);
      setReviewContent(response.reviewContent);
    } catch (err) {
      setReviewContent('검토 결과를 불러올 수 없습니다.');
      setError(err instanceof Error ? err.message : '검토 결과를 불러오는데 실패했습니다');
    } finally {
      setLoadingReview(false);
    }
  };

  const handleReviewDialogClose = () => {
    setReviewDialogOpen(false);
    setReviewContent('');
  };

  const getFileTypeText = (filename: string | undefined) => {
    if (!filename) return 'UNKNOWN';
    const ext = filename.split('.').pop()?.toUpperCase() || 'UNKNOWN';
    // Map extensions to display names
    const typeMap: Record<string, string> = {
      'JPG': 'IMAGE',
      'JPEG': 'IMAGE',
      'PNG': 'IMAGE',
      'PDF': 'PDF',
    };
    return typeMap[ext] || ext;
  };

  const getReviewStatus = (doc: DocumentMetadata) => {
    if (doc.reviewCompleted) {
      return {
        label: '검토 완료',
        color: 'success' as const,
      };
    }
    return {
      label: '검토 필요',
      color: 'warning' as const,
    };
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={700} sx={{ mb: 3 }}>
        문서 목록
      </Typography>

      {/* Search Bar */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <TextField
          fullWidth
          placeholder="파일명 또는 파일 ID로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="contained"
          onClick={handleSearch}
          sx={{ minWidth: 100 }}
        >
          검색
        </Button>
        {isSearching && (
          <Button
            variant="outlined"
            onClick={handleClearSearch}
            sx={{ minWidth: 100 }}
          >
            초기화
          </Button>
        )}
      </Box>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Empty State */}
      {!loading && documents.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {isSearching ? '검색 결과가 없습니다' : '업로드된 문서가 없습니다'}
          </Typography>
          {!isSearching && (
            <Button
              variant="contained"
              onClick={() => navigate('/upload')}
              sx={{ mt: 2 }}
            >
              첫 문서 업로드하기
            </Button>
          )}
        </Paper>
      )}

      {/* Document Table */}
      {!loading && documents.length > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>파일명</TableCell>
                  <TableCell width="180px">업로드 날짜</TableCell>
                  <TableCell width="120px" align="right">파일 크기</TableCell>
                  <TableCell width="100px" align="center">파일 유형</TableCell>
                  <TableCell width="120px" align="center">상태</TableCell>
                  <TableCell width="150px" align="center">검토 완료일</TableCell>
                  <TableCell width="160px" align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.map((doc) => {
                  return (
                    <TableRow
                      key={doc.documentId}
                      hover
                      sx={{
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <TableCell
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/preview/${doc.documentId}`)}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {doc.filename}
                        </Typography>
                      </TableCell>
                      <TableCell
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/preview/${doc.documentId}`)}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {formatDateShort(doc.uploadDate)}
                        </Typography>
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/preview/${doc.documentId}`)}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {formatFileSize(doc.fileSize)}
                        </Typography>
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/preview/${doc.documentId}`)}
                      >
                        <Typography variant="body2" fontWeight={600} color="text.secondary">
                          {getFileTypeText(doc.filename)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={getReviewStatus(doc).label}
                          color={getReviewStatus(doc).color}
                          size="small"
                          sx={{ borderRadius: 1 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        {doc.reviewCompleted && doc.completeDate ? (
                          <Typography variant="body2" color="text.secondary">
                            {formatDateShort(doc.completeDate)}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.disabled">
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/preview/${doc.documentId}`);
                          }}
                          size="small"
                          title="미리보기"
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton
                          color="info"
                          onClick={(e) => handleReviewClick(doc, e)}
                          size="small"
                          disabled={!doc.reviewCompleted}
                          title={doc.reviewCompleted ? "검토 결과 보기" : "검토 미완료"}
                          sx={{
                            opacity: doc.reviewCompleted ? 1 : 0.3,
                          }}
                        >
                          <ReviewIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={(e) => handleDeleteClick(doc, e)}
                          size="small"
                          title="삭제"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {!isSearching && totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(_, page) => setCurrentPage(page)}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>문서 삭제 확인</DialogTitle>
        <DialogContent>
          <DialogContentText>
            정말로 이 문서를 삭제하시겠습니까?
            <br />
            <br />
            <strong>{documentToDelete?.filename}</strong>
            <br />
            <br />
            이 작업은 되돌릴 수 없으며, S3 파일과 데이터베이스 레코드가 모두 삭제됩니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>
            취소
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleting ? '삭제 중...' : '삭제'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Review Content Dialog */}
      <Dialog
        open={reviewDialogOpen}
        onClose={handleReviewDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>검토 결과</DialogTitle>
        <DialogContent>
          {loadingReview ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Paper
              sx={{
                p: 3,
                bgcolor: 'white',
                maxHeight: '70vh',
                overflow: 'auto',
                '& h1': { 
                  fontSize: '1.75rem', 
                  fontWeight: 700, 
                  mt: 3, 
                  mb: 2,
                  pb: 1,
                  borderBottom: '2px solid #e0e0e0',
                },
                '& h2': { 
                  fontSize: '1.4rem', 
                  fontWeight: 600, 
                  mt: 3, 
                  mb: 1.5,
                  color: '#00467F',
                },
                '& h3': { 
                  fontSize: '1.15rem', 
                  fontWeight: 600, 
                  mt: 2, 
                  mb: 1,
                },
                '& p': { 
                  mb: 2,
                  lineHeight: 1.8,
                },
                '& ul, & ol': { 
                  pl: 4, 
                  mb: 2,
                  '& li': {
                    mb: 1,
                    lineHeight: 1.6,
                  },
                },
                '& code': { 
                  bgcolor: '#f5f5f5', 
                  px: 1, 
                  py: 0.5, 
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.9em',
                  border: '1px solid #e0e0e0',
                },
                '& pre': {
                  bgcolor: '#f5f5f5',
                  p: 2,
                  borderRadius: 1,
                  overflow: 'auto',
                  border: '1px solid #e0e0e0',
                  '& code': {
                    bgcolor: 'transparent',
                    border: 'none',
                    p: 0,
                  },
                },
                '& blockquote': {
                  borderLeft: '4px solid #00467F',
                  pl: 2,
                  ml: 0,
                  my: 2,
                  color: 'text.secondary',
                },
                '& hr': {
                  my: 3,
                  border: 'none',
                  borderTop: '1px solid #e0e0e0',
                },
                '& strong': {
                  fontWeight: 600,
                  color: '#00467F',
                },
              }}
            >
              {reviewContent ? (
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={{
                    h1: ({node, ...props}) => <Typography variant="h4" component="h1" {...props} />,
                    h2: ({node, ...props}) => <Typography variant="h5" component="h2" {...props} />,
                    h3: ({node, ...props}) => <Typography variant="h6" component="h3" {...props} />,
                    p: ({node, ...props}) => <Typography variant="body1" paragraph {...props} />,
                    li: ({node, ...props}) => <Typography variant="body2" component="li" {...props} />,
                  }}
                >
                  {reviewContent}
                </ReactMarkdown>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  검토 결과가 없습니다.
                </Typography>
              )}
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleReviewDialogClose}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DocumentListPage;
