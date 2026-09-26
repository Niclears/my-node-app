const http = require('http');

const GROUP = 'ББМО-01-23';
const PORT = 3000;
const MAX_SIZE = 1024 * 1024;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_SIZE) {
        reject({ code: 413, message: 'Payload Too Large' });
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseQuery(str) {
  const obj = {};
  if (!str) return obj;
  for (const pair of str.split('&')) {
    const [k, v] = pair.split('=');
    if (k) obj[decodeURIComponent(k)] = decodeURIComponent(v || '');
  }
  return obj;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/echo') {
      const buf = await readBody(req);
      console.log(`[INFO] /echo body size: ${buf.length} bytes`);
      const ct = req.headers['content-type'] || 'text/plain';
      if (ct.includes('application/json')) {
        const parsed = JSON.parse(buf.toString('utf8'));
        parsed.group = GROUP;
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(parsed, null, 2));
      } else {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(buf.toString('utf8'));
      }
      return;
    }

    if (req.method === 'POST' && req.url === '/form') {
      const buf = await readBody(req);
      const ct = req.headers['content-type'] || '';
      console.log(`[INFO] /form body size: ${buf.length} bytes`);
      const data = ct.includes('application/x-www-form-urlencoded')
        ? parseQuery(buf.toString('utf8'))
        : { raw: buf.toString('utf8') };
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  } catch (err) {
    if (err.code === 413) {
      res.writeHead(413, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('413 Payload Too Large');
    } else {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('400 Bad Request: ' + err.message);
    }
  }
});

server.listen(PORT, () => {
  console.log(`Сервер: http://localhost:${PORT}`);
});