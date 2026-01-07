import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  LinearProgress,
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import { requestUploadUrl, uploadFileToS3, saveMetadata } from '../services/api';
import { validateFile } from '../utils/validation';

function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file
      const validation = validateFile(selectedFile.name, selectedFile.size);
      if (!validation.valid) {
        setError(validation.error!);
        setFile(null);
        e.target.value = '';
        return;
      }
      
      setFile(selectedFile);
      setError('');
      setSuccess(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!file) {
      setError('파일을 선택해주세요');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Request upload URL
      setUploadStep('업로드 준비 중...');
      setUploadProgress(5);

      const uploadResponse = await requestUploadUrl({
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
      });

      // Step 2: Upload to S3
      setUploadStep('파일 업로드 중...');
      await uploadFileToS3(
        uploadResponse.uploadUrl,
        file,
        file.type,
        (progress) => {
          setUploadProgress(5 + (progress * 0.85)); // 5% ~ 90%
          setUploadStep(`파일 업로드 중... ${progress}%`);
        }
      );

      // Step 3: Save metadata
      setUploadStep('메타데이터 저장 중...');
      setUploadProgress(95);

      await saveMetadata({
        documentId: uploadResponse.documentId,
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
        s3Key: uploadResponse.fields.key,
      });

      setUploadProgress(100);
      setUploadStep('업로드 완료');
      setSuccess(true);
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      const errorMsg = err.message || '업로드에 실패했습니다';
      setError(errorMsg);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStep('');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={700} sx={{ mb: 3 }}>
        아키텍처 문서 업로드
      </Typography>

      <Paper sx={{ p: 3, mt: 2 }}>
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
            문서가 성공적으로 업로드되었습니다!
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Box
            sx={{
              border: '2px dashed #ccc',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              mb: 3,
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { 
                borderColor: 'primary.main',
                bgcolor: 'rgba(0, 70, 127, 0.02)',
              },
            }}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              hidden
              accept=".pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf"
              onChange={handleFileChange}
            />
            <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body1" sx={{ mb: 1 }}>
              {file ? file.name : '파일을 선택하거나 드래그하세요'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              지원 형식: PDF, PNG, JPG, JPEG (최대 50MB)
            </Typography>
          </Box>

          {uploading && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {uploadStep}
              </Typography>
            </Box>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={uploading || !file}
          >
            {uploading ? '업로드 중...' : '업로드'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

export default UploadPage;
