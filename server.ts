import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Log all API requests
  app.use('/api', (req, res, next) => {
    console.log(`API request: ${req.method} ${req.url}`);
    next();
  });

  // API Route to process documents
  app.post('/api/process-doc', upload.single('file'), async (req, res) => {
    console.log('Received request on /api/process-doc');
    try {
      if (!req.file) {
        console.warn('No file uploaded');
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileName = req.file.originalname;
      const mimeType = req.file.mimetype;
      let text = '';
      
      console.log(`Processing file: ${fileName}, MIME: ${mimeType}`);

      if (fileName.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        text = result.value;
      } else if (fileName.endsWith('.pdf')) {
        const data = await pdfParse(req.file.buffer);
        text = data.text;
      } else if (fileName.endsWith('.md') || mimeType === 'text/markdown' || mimeType === 'text/plain') {
        text = req.file.buffer.toString('utf-8');
      } else {
        console.warn(`Unsupported file type: ${fileName}, MIME: ${mimeType}`);
        return res.status(400).json({ error: 'Unsupported file type. Please upload .docx or .md files.' });
      }

      console.log('Successfully processed file');
      res.json({ text, fileName });
    } catch (error) {
      console.error('CRITICAL ERROR processing document:', error);
      res.status(500).json({ 
        error: 'Backend Failure', 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
