// cucina italiana — Entwicklungsserver + REWE Preis-Proxy
// Starten: node rewe-proxy.js
// Dann: http://localhost:8765

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8765;
const REWE_BASE = 'https://mobile-api.rewe.de/api/v3/products/search';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
};

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // ── REWE Proxy ──
  if (url.pathname === '/rewe') {
    const q = url.searchParams.get('q');
    if (!q) { res.writeHead(400); res.end(JSON.stringify({ error: 'Parameter q fehlt' })); return; }

    const target = `${REWE_BASE}?q=${encodeURIComponent(q)}&page=1&pageSize=5`;
    https.get(target, {
      headers: {
        'User-Agent': 'REWE-App/3.18 (iPhone; iOS 16.0)',
        'Accept': 'application/json',
        'Accept-Language': 'de-DE',
      }
    }, (upstream) => {
      let body = '';
      upstream.on('data', chunk => body += chunk);
      upstream.on('end', () => {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(upstream.statusCode);
        res.end(body);
      });
    }).on('error', (err) => {
      res.writeHead(502);
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }

  // ── Statische Dateien ──
  let filePath = path.join(__dirname, url.pathname === '/' ? 'index.html' : url.pathname);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found: ' + url.pathname);
      return;
    }
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.writeHead(200);
    res.end(data);
  });

}).listen(PORT, () => {
  console.log(`Cucina Italiana → http://localhost:${PORT}`);
  console.log('Beenden: Ctrl+C');
});
