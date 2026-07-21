import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.resolve('dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.wasm': 'application/wasm',
};

const server = http.createServer((req, res) => {
  // Add COOP/COEP headers for SharedArrayBuffer support (essential for ffmpeg.wasm)
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

  // Normalize URL path
  let safePath = req.url.split('?')[0];

  // Resolve to file path
  let filePath = path.join(DIST_DIR, safePath);

  // If path is a directory, serve index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // Support clean URLs (e.g., /tts -> /tts.html)
  if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    const htmlFallback = filePath + '.html';
    if (fs.existsSync(htmlFallback)) {
      filePath = htmlFallback;
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        const errorPage = path.join(DIST_DIR, '404.html');
        if (fs.existsSync(errorPage)) {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end(fs.readFileSync(errorPage));
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        }
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Local dev server running at http://localhost:${PORT}`);
  console.log(`🔒 COOP/COEP security headers injected for WebAssembly`);
});
