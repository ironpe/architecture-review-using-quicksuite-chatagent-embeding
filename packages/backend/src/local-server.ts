import express, { Request, Response } from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import { validateFile } from './utils/validation.js';
import { 
  UploadUrlRequest, 
  SaveMetadataRequest, 
  DocumentMetadata,
  ListDocumentsResponse,
  SearchDocumentsResponse,
  GetDocumentResponse 
} from './types/index.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3001;

// Log environment variables for debugging
console.log('Environment variables loaded:');
console.log('- AWS_REGION:', process.env.AWS_REGION);
console.log('- AWS_ACCOUNT_ID:', process.env.AWS_ACCOUNT_ID);
console.log('- QUICKSIGHT_ACCOUNT_ID:', process.env.QUICKSIGHT_ACCOUNT_ID);
console.log('- QUICKSIGHT_USER_NAME:', process.env.QUICKSIGHT_USER_NAME);
console.log('- QUICKSIGHT_AGENT_ARN:', process.env.QUICKSIGHT_AGENT_ARN ? 'Set' : 'Not set');
console.log('');

// Middleware - MUST be before routes
app.use(cors());
app.use(express.json());
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

// In-memory storage for local testing
const documents: Map<string, DocumentMetadata> = new Map();
const uploadedFiles: Map<string, { data: Buffer; contentType: string }> = new Map();

console.log('Setting up routes...');

// POST /documents/upload-url
app.post('/documents/upload-url', (req: Request, res: Response) => {
  console.log('POST /documents/upload-url called');
  try {
    const request: UploadUrlRequest = req.body;
    const { filename, fileType, fileSize } = request;

    console.log('Upload request:', { filename, fileType, fileSize });

    // Validate
    const validation = validateFile(filename, fileSize);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation Error',
        message: validation.error,
      });
    }

    // Generate document ID
    const documentId = randomUUID();
    const timestamp = Date.now();
    const s3Key = `${timestamp}-${documentId}-${filename}`;

    // For local testing, we'll use a local upload endpoint
    const uploadUrl = `http://localhost:${PORT}/local-upload/${documentId}`;

    console.log('Generated upload URL:', uploadUrl);

    res.json({
      documentId,
      uploadUrl,
      fields: {
        key: s3Key,
        'Content-Type': fileType,
      },
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate upload URL',
    });
  }
});

// PUT /local-upload/:documentId (simulates S3 upload)
app.put('/local-upload/:documentId', express.raw({ type: '*/*', limit: '50mb' }), (req: Request, res: Response) => {
  console.log('PUT /local-upload/:documentId called');
  try {
    const { documentId } = req.params;
    const contentType = req.headers['content-type'] || 'application/octet-stream';
    
    console.log('Uploading file for document:', documentId);

    // Store file data in memory
    uploadedFiles.set(documentId, {
      data: req.body as Buffer,
      contentType,
    });

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to upload file',
    });
  }
});

// POST /documents/metadata
app.post('/documents/metadata', (req: Request, res: Response) => {
  console.log('POST /documents/metadata called');
  try {
    const request: SaveMetadataRequest = req.body;
    const { documentId, filename, fileType, fileSize, s3Key } = request;

    const uploadTimestamp = Date.now();
    const metadata: DocumentMetadata = {
      documentId,
      filename,
      fileType,
      fileSize,
      s3Key,
      uploadTimestamp,
      uploadDate: new Date(uploadTimestamp).toISOString(),
      reviewCompleted: false,
    };

    documents.set(documentId, metadata);
    console.log('Metadata saved:', documentId);

    res.json({
      message: 'Metadata saved successfully',
      documentId,
    });
  } catch (error) {
    console.error('Error saving metadata:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to save metadata',
    });
  }
});

// GET /documents
app.get('/documents', (req: Request, res: Response) => {
  console.log('GET /documents called');
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Get all documents and sort by timestamp
    const allDocs = Array.from(documents.values())
      .sort((a, b) => b.uploadTimestamp - a.uploadTimestamp);

    const totalCount = allDocs.length;
    const totalPages = Math.ceil(totalCount / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedDocs = allDocs.slice(startIndex, endIndex);

    const response: ListDocumentsResponse = {
      documents: paginatedDocs,
      totalCount,
      currentPage: page,
      totalPages,
    };

    res.json(response);
  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list documents',
    });
  }
});

// GET /documents/search
app.get('/documents/search', (req: Request, res: Response) => {
  console.log('GET /documents/search called');
  try {
    const query = req.query.query as string;

    if (!query) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Search query is required',
      });
    }

    const lowerQuery = query.toLowerCase();
    const matchingDocs = Array.from(documents.values())
      .filter(doc => doc.filename.toLowerCase().includes(lowerQuery))
      .sort((a, b) => b.uploadTimestamp - a.uploadTimestamp);

    const response: SearchDocumentsResponse = {
      documents: matchingDocs,
      totalCount: matchingDocs.length,
    };

    res.json(response);
  } catch (error) {
    console.error('Error searching documents:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to search documents',
    });
  }
});

// GET /documents/:documentId
app.get('/documents/:documentId', (req: Request, res: Response) => {
  console.log('GET /documents/:documentId called');
  try {
    const { documentId } = req.params;

    const metadata = documents.get(documentId);
    if (!metadata) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Document not found',
      });
    }

    // Generate local file URL
    const presignedUrl = `http://localhost:${PORT}/local-file/${documentId}`;

    const response: GetDocumentResponse = {
      metadata,
      presignedUrl,
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting document:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get document',
    });
  }
});

// GET /local-file/:documentId (simulates S3 pre-signed URL)
app.get('/local-file/:documentId', (req: Request, res: Response) => {
  console.log('GET /local-file/:documentId called');
  try {
    const { documentId } = req.params;

    const file = uploadedFiles.get(documentId);
    if (!file) {
      return res.status(404).send('File not found');
    }

    res.setHeader('Content-Type', file.contentType);
    res.send(file.data);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).send('Failed to serve file');
  }
});

// GET /quicksight/embed-url
app.get('/quicksight/embed-url', async (_req: Request, res: Response) => {
  console.log('GET /quicksight/embed-url called');
  try {
    // 공유 URL 사용 (새 창에서 작동)
    const embedUrl = process.env.QUICKSIGHT_EMBED_URL;
    
    if (!embedUrl) {
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'QUICKSIGHT_EMBED_URL is not configured',
      });
    }
    
    res.json({
      embedUrl: embedUrl,
      status: 200,
    });
  } catch (error) {
    console.error('Error generating QuickSight embed URL:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate QuickSight embed URL',
    });
  }
});

// Test route
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Local development server running at http://localhost:${PORT}`);
  console.log(`📝 API endpoints:`);
  console.log(`   POST   /documents/upload-url`);
  console.log(`   POST   /documents/metadata`);
  console.log(`   GET    /documents`);
  console.log(`   GET    /documents/search`);
  console.log(`   GET    /documents/:documentId`);
  console.log(`   GET    /quicksight/embed-url`);
  console.log(`   GET    /health (test endpoint)`);
  console.log(`\n💡 Frontend should connect to: http://localhost:${PORT}\n`);
});
