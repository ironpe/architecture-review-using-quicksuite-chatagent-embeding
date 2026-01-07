import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import { Routes, Route, Navigate } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import DocumentListPage from './pages/DocumentListPage';
import PreviewPage from './pages/PreviewPage';
import LoginPage from './pages/LoginPage';
import CallbackPage from './pages/CallbackPage';
import ProtectedRoute from './components/ProtectedRoute';
import './config/cognito'; // Initialize Amplify

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#00467F', // Korean Air Blue
      light: '#0066B3',
      dark: '#003366',
    },
    secondary: {
      main: '#E31837', // Korean Air Red
      light: '#FF4458',
      dark: '#B71C1C',
    },
    background: {
      default: '#FFFFFF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1a1a1a',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Noto Sans KR"',
      'sans-serif',
    ].join(','),
    h4: {
      fontWeight: 700,
      fontSize: '1.75rem',
      letterSpacing: '-0.5px',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.125rem',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 4,
          padding: '10px 24px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: '1px solid #e0e0e0',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: 'none',
          border: '1px solid #e0e0e0',
        },
        elevation3: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <Layout>
            <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, py: 4 }}>
              <Routes>
                <Route path="/" element={<Navigate to="/upload" replace />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/callback" element={<CallbackPage />} />
                <Route
                  path="/upload"
                  element={
                    <ProtectedRoute>
                      <UploadPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/documents"
                  element={
                    <ProtectedRoute>
                      <DocumentListPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/preview/:documentId"
                  element={
                    <ProtectedRoute>
                      <PreviewPage />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Box>
          </Layout>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
