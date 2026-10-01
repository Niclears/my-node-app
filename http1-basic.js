const http = require('http');

const GROUP = 'ББМО-01-23';
const PORT = 3000;

function now() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
       + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const server = http.createServer((req, res) => {
  let status = 200;
  let body = '';
  let type = 'text/plain; charset=utf-8';

  if (req.method === 'GET' && req.url === '/') {
    type = 'text/html; charset=utf-8';
    body = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>ЛР20</title></head>
<body>
<h1>Лабораторная работа №20</h1>
<p>Группа: ${GROUP}</p>
<p>Студент: Козлов Михаил Денисович</p>
<p>Дата: ${now()}</p>
<ul>
  <li><a href="/">/</a></li>
  <li><a href="/about">/about</a></li>
  <li><a href="/unknown">/unknown</a> — 404</li>
</ul>
</body></html>`;
  } else if (req.method === 'GET' && req.url === '/about') {
    body = `ЛР20, группа ${GROUP}, Козлов М.Д.`;
  } else {
    status = 404;
    body = 'Not Found';
  }

  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
  console.log(`[${now()}] [${GROUP}] ${req.method} ${req.url} ${status}`);
});

server.listen(PORT, () => {
  console.log(`HTTP-сервер запущен на http://localhost:${PORT}`);
  console.log(`Группа: ${GROUP}`);
});