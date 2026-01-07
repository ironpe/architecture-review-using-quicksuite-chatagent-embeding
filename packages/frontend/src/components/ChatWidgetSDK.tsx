import { useEffect, useRef, useState } from 'react';
import {
  Box,
  IconButton,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Fade,
  SvgIcon,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { embedDashboard } from 'amazon-quicksight-embedding-sdk';

// QuickSight 스타일 채팅 아이콘
function QuickSightChatIcon(props: any) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M14.07,6.42l2.34.91.92,2.32c.06.15.2.25.37.25s.31-.1.37-.25l.92-2.32,2.34-.91c.15-.06.25-.2.25-.36s-.1-.3-.25-.36l-2.34-.91-.92-2.32c-.06-.15-.2-.25-.37-.25s-.31.1-.37.25l-.92,2.32-2.34.91c-.15.06-.25.2-.25.36s.1.3.25.36Z"></path>
      <path d="M20.78,16.85c.8-1.38,1.22-2.92,1.22-4.49,0-.54-.05-1.08-.15-1.61-.1-.54-.62-.9-1.16-.8-.54.1-.9.62-.8,1.16.08.41.11.83.11,1.25,0,1.33-.39,2.64-1.13,3.79-.15.24-.2.53-.12.8l.58,2.15-2.24-.6c-.26-.07-.54-.03-.77.11-1.29.77-2.78,1.18-4.31,1.18-4.41,0-8-3.33-8-7.42s3.59-7.42,8-7.42c.55,0,1-.45,1-1s-.45-1-1-1C6.49,2.94,2,7.16,2,12.36s4.49,9.42,10,9.42c1.74,0,3.44-.43,4.95-1.25l3.52.94c.35.09.71,0,.97-.26.25-.25.35-.62.26-.97l-.91-3.41Z"></path>
    </SvgIcon>
  );
}

interface ChatWidgetSDKProps {
  isOpen: boolean;
  onClose: () => void;
}

function ChatWidgetSDK({ isOpen, onClose }: ChatWidgetSDKProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const embeddedChatRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen && containerRef.current && !embeddedChatRef.current) {
      embedQuickSightChat();
    }
  }, [isOpen]);

  const embedQuickSightChat = async () => {
    if (!containerRef.current) return;

    setLoading(true);
    setError(null);

    try {
      // 백엔드에서 임베드 URL 가져오기
      const response = await fetch('http://localhost:3001/quicksight/embed-url');
      const data = await response.json();

      // QuickSight Embedding SDK 사용
      const embeddingContext = await embedDashboard({
        url: data.embedUrl,
        container: containerRef.current,
        height: '100%',
        width: '100%',
        scrolling: 'no',
        locale: 'ko-KR',
        footerPaddingEnabled: false,
      });

      embeddedChatRef.current = embeddingContext;

      // 이벤트 리스너 추가
      embeddingContext.on('error', (event: any) => {
        console.error('QuickSight embedding error:', event);
        setError('채팅 에이전트 로드에 실패했습니다.');
      });

      embeddingContext.on('load', () => {
        console.log('QuickSight chat loaded successfully');
        setLoading(false);
      });

    } catch (err) {
      console.error('Error embedding QuickSight:', err);
      setError(err instanceof Error ? err.message : '채팅 에이전트를 로드할 수 없습니다.');
      setLoading(false);
    }
  };

  return (
    <Fade in={isOpen}>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          top: 90,
          right: 24,
          width: 450,
          height: 800,
          zIndex: 1299,
          display: isOpen ? 'flex' : 'none',
          flexDirection: 'column',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QuickSightChatIcon />
            <Typography variant="h6" fontWeight={600}>
              AI Chat Assistant
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, position: 'relative', bgcolor: 'grey.50' }}>
          {loading && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 2,
                bgcolor: 'rgba(255,255,255,0.9)',
                zIndex: 1,
              }}
            >
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">
                채팅 에이전트를 로드하는 중...
              </Typography>
            </Box>
          )}

          {error && (
            <Box sx={{ p: 3 }}>
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            </Box>
          )}

          {/* QuickSight Embed Container */}
          <Box
            ref={containerRef}
            sx={{
              width: '100%',
              height: '100%',
            }}
          />
        </Box>
      </Paper>
    </Fade>
  );
}

export default ChatWidgetSDK;
