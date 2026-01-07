import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { Login as LoginIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const REMEMBERED_EMAIL_KEY = 'rememberedEmail';
const REMEMBER_ME_KEY = 'rememberMe';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    const shouldRemember = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
    
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(shouldRemember);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('이메일과 패스워드를 입력해주세요');
      setLoading(false);
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('올바른 이메일 형식이 아닙니다');
      setLoading(false);
      return;
    }

    try {
      await login(email, password, rememberMe);
      
      // Save email if remember me is checked
      if (rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
        localStorage.setItem(REMEMBER_ME_KEY, 'true');
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        localStorage.removeItem(REMEMBER_ME_KEY);
      }
      
      navigate('/upload');
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Handle specific Cognito errors
      if (err.message.includes('UserNotFoundException')) {
        setError('존재하지 않는 사용자입니다');
      } else if (err.message.includes('NotAuthorizedException')) {
        setError('이메일 또는 패스워드가 올바르지 않습니다');
      } else if (err.message.includes('UserNotConfirmedException')) {
        setError('이메일 인증이 필요합니다');
      } else if (err.message.includes('PasswordResetRequiredException')) {
        setError('패스워드 재설정이 필요합니다');
      } else if (err.message.includes('TooManyRequestsException')) {
        setError('너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요');
      } else {
        setError(err.message || '로그인에 실패했습니다');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 200px)',
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <LoginIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>
            로그인
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Architecture Review System에 오신 것을 환영합니다
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="이메일"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            sx={{ mb: 2 }}
            placeholder="example@company.com"
            autoComplete="email"
          />

          <TextField
            fullWidth
            label="패스워드"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            sx={{ mb: 2 }}
            placeholder="패스워드를 입력하세요"
            autoComplete="current-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    disabled={loading}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
                color="primary"
              />
            }
            label="로그인 상태 유지 (30일)"
            sx={{ mb: 3 }}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
            disabled={loading}
          >
            {loading ? '로그인 중...' : '로그인'}
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3, textAlign: 'center' }}>
          🔒 AWS Cognito를 사용한 안전한 인증
        </Typography>
      </Paper>
    </Box>
  );
}

export default LoginPage;
