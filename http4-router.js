const http = require('http');
const url = require('url');

const GROUP = 'ББМО-01-23';
const PORT = 3000;

let students = [
  { id: 1, name: 'Иван', group: 'ББМО-01-23' },
  { id: 2, name: 'Мария', group: 'ББМО-01-23' }
];
let nextId = 3;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function now() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
       + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function sendJSON(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj, null, 2));
}

const routes = [
  { method: 'GET',    pattern: ['api', 'students'],        handler: listStudents },
  { method: 'GET',    pattern: ['api', 'students', ':id'], handler: getStudent },
  { method: 'POST',   pattern: ['api', 'students'],        handler: createStudent },
  { method: 'PUT',    pattern: ['api', 'students', ':id'], handler: updateStudent },
  { method: 'DELETE', pattern: ['api', 'students', ':id'], handler: deleteStudent },
  { method: 'GET',    pattern: ['search'],                 handler: searchHandler }
];

function listStudents(req, res, params, query) {
  let result = students;
  if (query.group) result = result.filter((s) => s.group === query.group);
  sendJSON(res, 200, result);
}

function getStudent(req, res, params) {
  const s = students.find((x) => x.id === Number(params.id));
  if (!s) return sendJSON(res, 404, { error: 'Студент не найден' });
  sendJSON(res, 200, s);
}

async function createStudent(req, res) {
  const body = await readBody(req);
  let data;
  try { data = JSON.parse(body); } catch { return sendJSON(res, 400, { error: 'Invalid JSON' }); }
  if (!data.name || !data.group) return sendJSON(res, 400, { error: 'name и group обязательны' });
  const s = { id: nextId++, name: data.name, group: data.group };
  students.push(s);
  sendJSON(res, 201, s);
}

async function updateStudent(req, res, params) {
  const s = students.find((x) => x.id === Number(params.id));
  if (!s) return sendJSON(res, 404, { error: 'Студент не найден' });
  const body = await readBody(req);
  let data;
  try { data = JSON.parse(body); } catch { return sendJSON(res, 400, { error: 'Invalid JSON' }); }
  if (data.name !== undefined) s.name = data.name;
  if (data.group !== undefined) s.group = data.group;
  sendJSON(res, 200, s);
}

function deleteStudent(req, res, params) {
  const idx = students.findIndex((x) => x.id === Number(params.id));
  if (idx === -1) return sendJSON(res, 404, { error: 'Студент не найден' });
  const [removed] = students.splice(idx, 1);
  sendJSON(res, 200, { deleted: true, id: removed.id });
}

function searchHandler(req, res, params, query) {
  sendJSON(res, 200, { q: query.q || '', limit: query.limit ? Number(query.limit) : 10 });
}

function matchRoute(method, pathname) {
  const segments = pathname.split('/').filter(Boolean);
  let methodExists = false;

  for (const r of routes) {
    if (r.pattern.length !== segments.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < r.pattern.length; i++) {
      const p = r.pattern[i];
      if (p.startsWith(':')) params[p.slice(1)] = segments[i];
      else if (p !== segments[i]) { ok = false; break; }
    }
    if (ok) {
      methodExists = true;
      if (r.method === method) return { handler: r.handler, params };
    }
  }
  return methodExists ? { methodNotAllowed: true } : null;
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const matched = matchRoute(req.method, parsed.pathname);

  if (!matched) {
    sendJSON(res, 404, { error: 'Not Found' });
    console.log(`[${now()}] [${GROUP}] ${req.method} ${parsed.pathname} 404`);
    return;
  }
  if (matched.methodNotAllowed) {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('405 Method Not Allowed');
    console.log(`[${now()}] [${GROUP}] ${req.method} ${parsed.pathname} 405`);
    return;
  }

  try {
    await matched.handler(req, res, matched.params, parsed.query);
    console.log(`[${now()}] [${GROUP}] ${req.method} ${parsed.pathname} ${res.statusCode}`);
  } catch (err) {
    sendJSON(res, 500, { error: err.message });
    console.log(`[${now()}] [${GROUP}] ${req.method} ${parsed.pathname} 500`);
  }
});

server.listen(PORT, () => {
  console.log(`Сервер: http://localhost:${PORT}`);
});