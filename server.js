const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const ROOT_DIR = __dirname;
const FRAMES_DIR = path.join(ROOT_DIR, 'ezgif-5a4e78d4d538abe8-jpg');

// Preload all frames into RAM for instantaneous delivery (< 0.2ms per image)
const frameCache = new Map();
try {
  const files = fs.readdirSync(FRAMES_DIR);
  for (const file of files) {
    if (file.endsWith('.jpg')) {
      const fullPath = path.join(FRAMES_DIR, file);
      frameCache.set(file, fs.readFileSync(fullPath));
    }
  }
  console.log(`Preloaded ${frameCache.size} frames into RAM.`);
} catch (err) {
  console.error('Failed preloading frames:', err);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png'
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  if (pathname === '/') {
    pathname = '/index.html';
  }

  // Check in-memory frame cache first
  const frameMatch = pathname.match(/\/ezgif-5a4e78d4d538abe8-jpg\/([^\/]+)$/);
  if (frameMatch && frameCache.has(frameMatch[1])) {
    const buffer = frameCache.get(frameMatch[1]);
    res.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(buffer);
    return;
  }

  // Normal static file handling
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(ROOT_DIR, safePath);

  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000'
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
