
const http = require('http');

const GROUP_RU = 'ББМО-01-23';
const GROUP_ASCII = 'BBMO-01-23';
const PORT = 3000;

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/headers') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Powered-By': 'Node.js',
      'X-Group': GROUP_ASCII,
      'Cache-Control': 'no-cache'
    });
    res.end(JSON.stringify({
      headers: req.headers,
      method: req.method,
      url: req.url,
      httpVersion: req.httpVersion
    }, null, 2));
    return;
  }

  if (req.method === 'GET' && req.url === '/headers/set') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Powered-By', 'Node.js');
    res.setHeader('X-Group', GROUP_ASCII);
    res.setHeader('Cache-Control', 'no-cache');
    res.writeHead(200);
    res.end(`<h1>Заголовки установлены</h1>
<p>X-Powered-By: ${res.getHeader('X-Powered-By')}</p>
<p>X-Group: ${res.getHeader('X-Group')}</p>
<p>Cache-Control: ${res.getHeader('Cache-Control')}</p>`);
    return;
  }

  if (req.method === 'GET' && req.url === '/headers/check') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      hasContentType: res.hasHeader('Content-Type'),
      hasXGroup: res.hasHeader('X-Group'),
      hasUnknown: res.hasHeader('X-Unknown')
    }, null, 2));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`Сервер: http://localhost:${PORT}`);
});