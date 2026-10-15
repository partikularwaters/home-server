/* Dependency-free local preview, including the Vercel API adapter. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const handler = require('../api/backoffice.js');
const root = path.resolve(__dirname, '../public');
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.ico':'image/x-icon', '.webp':'image/webp' };
const server = http.createServer(async (req, res) => {
  if (req.url.split('?')[0] === '/api/backoffice') {
    let body = '';
    for await (const part of req) {
      body += part;
      if (body.length > 100000) { res.writeHead(413); return res.end(); }
    }
    req.body = body;
    res.status = n => { res.statusCode = n; return res; };
    res.json = x => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(x)); };
    return handler(req, res);
  }
  let decoded;
  try { decoded = decodeURIComponent(req.url.split('?')[0]); } catch (_) { res.writeHead(400); return res.end(); }
  const file = path.resolve(root, '.' + (decoded === '/' ? '/index.html' : decoded));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  try {
    const content = await fs.promises.readFile(file);
    res.writeHead(200, { 'Content-Type':types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' });
    res.end(content);
  } catch (_) { res.writeHead(404); res.end('Not found'); }
});
server.listen(Number(process.env.PORT || 8080), '127.0.0.1', () => console.log('HomeServer preview: http://127.0.0.1:' + server.address().port));
