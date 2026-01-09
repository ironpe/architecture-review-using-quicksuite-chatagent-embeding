import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { ArrowBack, Description, Image, PictureAsPdf } from '@mui/icons-material';
import { getDocument } from '../services/api';
import { GetDocumentResponse } from '../types';
import { formatDate } from '../utils/date';
import { formatFileSize, getFileTypeCategory } from '../utils/validation';

function PreviewPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<GetDocumentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (documentId) {
      loadDocument(documentId);
    }
  }, [documentId]);

  const loadDocument = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getDocument(id);
      setDocument(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (filename: string) => {
    const category = getFileTypeCategory(filename);
    switch (category) {
      case 'image':
        return <Image sx={{ fontSize: 64, color: '#E31837' }} />;
      case 'pdf':
        return <PictureAsPdf sx={{ fontSize: 64, color: '#00467F' }} />;
      default:
        return <Description sx={{ fontSize: 64, color: '#757575' }} />;
    }
  };

  const getFileTypeText = (filename: string) => {
    const ext = filename.split('.').pop()?.toUpperCase() || 'UNKNOWN';
    const typeMap: Record<string, string> = {
      'JPG': 'IMAGE',
      'JPEG': 'IMAGE',
      'PNG': 'IMAGE',
      'PDF': 'PDF',
    };
    return typeMap[ext] || ext;
  };

  const getFileTypeColor = (filename: string): 'error' | 'primary' | 'default' => {
    const category = getFileTypeCategory(filename);
    const colorMap: Record<string, 'error' | 'primary' | 'default'> = {
      image: 'error',
      pdf: 'primary',
      unknown: 'default',
    };
    return colorMap[category] || 'default';
  };

  const renderPreview = () => {
    if (!document) return null;

    const category = getFileTypeCategory(document.metadata.filename);

    switch (category) {
      case 'image':
        return (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <img
              src={document.presignedUrl}
              alt={document.metadata.filename}
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: '8px',
              }}
              onError={() => setError('이미지를 불러오는데 실패했습니다')}
            />
          </Paper>
        );

      case 'pdf':
        return (
          <Paper sx={{ p: 0, overflow: 'hidden' }}>
            <iframe
              src={document.presignedUrl}
              style={{
                width: '100%',
                height: '70vh',
                border: 'none',
              }}
              title={document.metadata.filename}
            />
            <Box sx={{ p: 2, bgcolor: 'grey.50', textAlign: 'center', borderTop: '1px solid #e0e0e0' }}>
              <Typography variant="caption" color="text.secondary">
                PDF가 표시되지 않으면{' '}
                <a 
                  href={document.presignedUrl} 
                  download 
                  style={{ color: '#00467F', fontWeight: 600 }}
                >
                  여기를 클릭하여 다운로드
                </a>
                하세요.
              </Typography>
            </Box>
          </Paper>
        );

      default:
        return (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              미리보기를 사용할 수 없습니다
            </Typography>
            <Button
              variant="contained"
              href={document.presignedUrl}
              download={document.metadata.filename}
            >
              파일 다운로드
            </Button>
          </Paper>
        );
    }
  };

  return (
    <Box>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/documents')}
        sx={{ mb: 2 }}
      >
        목록으로 돌아가기
      </Button>

      <Typography variant="h4" gutterBottom fontWeight={700} sx={{ mb: 3 }}>
        문서 미리보기
      </Typography>

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

      {/* Document Content */}
      {document && !loading && (
        <>
          {/* Document Metadata */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
              <Box>
                {getFileIcon(document.metadata.filename)}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                  <Typography variant="h5" component="div" fontWeight={600}>
                    {document.metadata.filename}
                  </Typography>
                  <Chip
                    label={getFileTypeText(document.metadata.filename)}
                    color={getFileTypeColor(document.metadata.filename)}
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      파일 ID
                    </Typography>
                    <Typography variant="body2" fontWeight={500} sx={{ fontFamily: 'monospace' }}>
                      {document.metadata.documentId}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      업로드 날짜
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {formatDate(document.metadata.uploadDate)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      파일 크기
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {formatFileSize(document.metadata.fileSize)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      파일 타입
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {document.metadata.fileType.split('/')[1]?.toUpperCase() || 'Unknown'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Paper>

          {/* Preview Content */}
          {renderPreview()}
        </>
      )}
    </Box>
  );
}

export default PreviewPage;
