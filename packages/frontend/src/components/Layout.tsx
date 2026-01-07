import { ReactNode, useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Container, Avatar } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { Architecture as ArchIcon, CloudUpload, Folder, Login, Logout } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import ChatButton from './ChatButton';
import ChatWidget from './ChatWidget';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(450);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleChatToggle = () => {
    setIsChatOpen(!isChatOpen);
  };

  const handleChatClose = () => {
    setIsChatOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#fafafa' }}>
      {/* Glassmorphism Header */}
      <AppBar 
        position="static" 
        elevation={0} 
        sx={{ 
          bgcolor: '#00467F',
          borderBottom: 'none',
        }}
      >
        <Toolbar sx={{ minHeight: 70, px: 3 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              '&:hover': { opacity: 0.9 }
            }} 
            onClick={() => navigate('/')}
          >
            <ArchIcon sx={{ fontSize: 36, mr: 1.5, color: 'white' }} />
            <Typography variant="h5" component="div" sx={{ fontWeight: 800, letterSpacing: '-0.5px', fontSize: '1.5rem' }}>
              Architecture Review System
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {isAuthenticated && (
            <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
              <Button
                color="inherit"
                onClick={() => navigate('/upload')}
                startIcon={<CloudUpload />}
                sx={{
                  fontWeight: 600,
                  bgcolor: isActive('/upload') ? 'rgba(255,255,255,0.15)' : 'transparent',
                  border: isActive('/upload') ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                  },
                }}
              >
                업로드
              </Button>
              <Button
                color="inherit"
                onClick={() => navigate('/documents')}
                startIcon={<Folder />}
                sx={{
                  fontWeight: 600,
                  bgcolor: isActive('/documents') ? 'rgba(255,255,255,0.15)' : 'transparent',
                  border: isActive('/documents') ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                  },
                }}
              >
                문서 목록
              </Button>
            </Box>
          )}

          {/* Auth Section */}
          {isAuthenticated ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar 
                  sx={{ 
                    width: 36, 
                    height: 36, 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    fontSize: '1rem',
                    fontWeight: 700,
                  }}
                >
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </Avatar>
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                  <Typography variant="body2" sx={{ color: 'white', fontWeight: 600, lineHeight: 1.2 }}>
                    {user?.name}
                  </Typography>
                </Box>
              </Box>
              <Button 
                color="inherit" 
                onClick={handleLogout}
                startIcon={<Logout />}
                size="small"
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontWeight: 600,
                  '&:hover': { 
                    bgcolor: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.3)',
                  }
                }}
              >
                로그아웃
              </Button>
              {/* Chat Button */}
              <ChatButton onClick={handleChatToggle} />
            </Box>
          ) : (
            <Button 
              color="inherit" 
              onClick={() => navigate('/login')}
              startIcon={<Login />}
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                fontWeight: 600,
                '&:hover': { 
                  bgcolor: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                }
              }}
            >
              로그인
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 70px)',
          bgcolor: '#fafafa',
          marginRight: isChatOpen ? `${chatWidth}px` : 0,
          transition: 'margin-right 0.3s ease',
        }}
      >
        <Container maxWidth="lg" sx={{ py: 3, px: 3 }}>
          {children}
        </Container>
      </Box>

      {/* Chat Widget - Only show when authenticated */}
      {isAuthenticated && (
        <ChatWidget 
          isOpen={isChatOpen} 
          onClose={handleChatClose}
          onWidthChange={setChatWidth}
        />
      )}
    </Box>
  );
}

export default Layout;
