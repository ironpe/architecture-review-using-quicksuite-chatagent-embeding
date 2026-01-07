import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

function CallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // After Cognito Hosted UI redirects back, navigate to home
    const timer = setTimeout(() => {
      navigate('/upload');
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        gap: 2,
      }}
    >
      <CircularProgress size={60} />
      <Typography variant="h6" color="text.secondary">
        로그인 처리 중...
      </Typography>
    </Box>
  );
}

export default CallbackPage;
