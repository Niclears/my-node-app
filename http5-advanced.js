const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GROUP_RU = 'ББМО-01-23';
const GROUP_ASCII = 'BBMO-01-23';
const HTTP_PORT = 3000;
const HTTPS_PORT = 3443;
const PUBLIC_DIR = path.join(__dirname, 'public');
const LOG_FILE = path.join(__dirname, 'access.log');
const STREAM_FILE = path.join(__dirname, 'big-file.bin');

const metrics = { group: GROUP_RU, total: 0, byMethod: {}, byStatus: {}, startTime: Date.now() };

function now() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
       + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function logAccess(method, url, status) {
  fs.appendFileSync(LOG_FILE, `[${now()}] [${GROUP_RU}] ${method} ${url} ${status}\n`, 'utf8');
}

const middlewares = [];
const use = (fn) => middlewares.push(fn);

function runMiddlewares(req, res) {
  let i = 0;
  function next(err) {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message, status: 500 }));
      return;
    }
    const mw = middlewares[i++];
    if (!mw) return;
    try { mw(req, res, next); } catch (e) { next(e); }
  }
  next();
}

use((req, res, next) => {
  res.setHeader('X-Group', GROUP_ASCII);
  next();
});

use((req, res, next) => {
  res.on('finish', () => {
    metrics.total++;
    metrics.byMethod[req.method] = (metrics.byMethod[req.method] || 0) + 1;
    metrics.byStatus[res.statusCode] = (metrics.byStatus[res.statusCode] || 0) + 1;
    logAccess(req.method, req.url, res.statusCode);
  });
  next();
});

const cache = new Map();
const CACHE_TTL = 60 * 1000;

use((req, res, next) => {
  if (req.method !== 'GET') return next();
  const key = req.url;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    res.setHeader('Cache-Control', `max-age=${CACHE_TTL / 1000}`);
    res.setHeader('X-Cache', 'HIT');
    res.writeHead(cached.status);
    res.end(cached.body);
    return;
  }
  const origEnd = res.end.bind(res);
  res.end = function (body) {
    if (res.statusCode === 200 && body !== undefined) {
      cache.set(key, { status: res.statusCode, body, time: Date.now() });
    }
    return origEnd(body);
  };
  next();
});

function serveStatic(req, res) {
  const rel = req.url.replace(/^\/static\/?/, '');
  const target = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!target.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }
  fs.stat(target, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    const etag = '"' + crypto.createHash('md5').update(String(stats.size) + stats.mtimeMs).digest('hex') + '"';
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304);
      res.end();
      return;
    }
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.txt': 'text/plain; charset=utf-8'
    }[path.extname(target).toLowerCase()] || 'application/octet-stream';

    res.setHeader('Content-Type', mime);
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'max-age=60');
    res.writeHead(200);
    fs.createReadStream(target).pipe(res);
  });
}

function streamFile(req, res) {
  if (!fs.existsSync(STREAM_FILE)) {
    fs.writeFileSync(STREAM_FILE, Buffer.alloc(1024 * 1024, 'A'));
  }
  const stat = fs.statSync(STREAM_FILE);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', String(stat.size));
  res.writeHead(200);
  fs.createReadStream(STREAM_FILE).pipe(res);
}

const requestListener = (req, res) => {
  runMiddlewares(req, res);
  setImmediate(() => {
    if (res.writableEnded) return;
    const u = req.url.split('?')[0];
    if (req.method === 'GET' && u === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`=== HTTP-сервер работает! ===\nГруппа: ${GROUP_RU}\n`);
      return;
    }
    if (req.method === 'GET' && u === '/metrics') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ...metrics, uptime: Math.floor((Date.now() - metrics.startTime) / 1000) }, null, 2));
      return;
    }
    if (req.method === 'GET' && u.startsWith('/static/')) return serveStatic(req, res);
    if (req.method === 'GET' && u === '/stream') return streamFile(req, res);
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  });
};

http.createServer(requestListener).listen(HTTP_PORT, () => {
  console.log(`[INFO] HTTP-сервер запущен на порту ${HTTP_PORT}`);
  console.log(`[INFO] Группа: ${GROUP_RU}`);
});

const KEY_FILE = path.join(__dirname, 'certs', 'key.pem');
const CERT_FILE = path.join(__dirname, 'certs', 'cert.pem');

if (!fs.existsSync(KEY_FILE) || !fs.existsSync(CERT_FILE)) {
  console.log('[INFO] Генерируем самоподписанный сертификат...');
  const { execSync } = require('child_process');
  try {
    execSync(`openssl req -x509 -newkey rsa:2048 -nodes -keyout "${KEY_FILE}" -out "${CERT_FILE}" -days 365 -subj "/CN=localhost"`, { stdio: 'ignore' });
  } catch (e) {
    console.warn('[WARN] openssl не найден — HTTPS не будет запущен');
  }
}

if (fs.existsSync(KEY_FILE) && fs.existsSync(CERT_FILE)) {
  https.createServer(
    { key: fs.readFileSync(KEY_FILE), cert: fs.readFileSync(CERT_FILE) },
    (req, res) => {
      res.setHeader('X-Group', GROUP_ASCII);
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`=== HTTPS работает! ===\nГруппа: ${GROUP_RU}\n`);
    }
  ).listen(HTTPS_PORT, () => console.log(`[INFO] HTTPS-сервер запущен на порту ${HTTPS_PORT}`));
}

process.on('SIGINT', () => {
  console.log('\n[INFO] Завершение работы...');
  process.exit(0);
});