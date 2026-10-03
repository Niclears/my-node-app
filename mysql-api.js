require('dotenv').config();
const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const mysql = require('mysql2/promise');

const GROUP = 'ББМО-01-23';
const PORT = 3000;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10
});


const metrics = { queries: 0, errors: 0, totalTime: 0, cacheHits: 0, cacheMisses: 0 };

async function query(sql, params) {
  const t0 = Date.now();
  metrics.queries++;
  try {
    const [rows] = await pool.query(sql, params);
    metrics.totalTime += Date.now() - t0;
    return rows;
  } catch (e) {
    metrics.errors++;
    throw e;
  }
}


const cache = new Map();
const TTL = 60 * 1000;

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) { metrics.cacheMisses++; return null; }
  if (Date.now() - entry.t > TTL) { cache.delete(key); metrics.cacheMisses++; return null; }
  metrics.cacheHits++;
  return entry.v;
}

function cacheSet(key, value) { cache.set(key, { v: value, t: Date.now() }); }
function cacheInvalidate(prefix) {
  for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k);
}


const app = new Koa();
const router = new Router();
app.use(bodyParser());

app.use(async (ctx, next) => {
  ctx.set('X-Group', 'BBMO-01-23');
  const start = Date.now();
  try {
    await next();
  } finally {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
             + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    console.log(`[${ts}] [${GROUP}] ${ctx.method} ${ctx.url} ${ctx.status} (${Date.now() - start}ms)`);
  }
});


app.use(async (ctx, next) => {
  try { await next(); }
  catch (err) {
    const map = {
      ER_DUP_ENTRY: 409,
      ER_NO_REFERENCED_ROW: 400,
      ER_BAD_NULL_ERROR: 400,
      ECONNREFUSED: 503
    };
    ctx.status = map[err.code] || 500;
    ctx.body = { error: err.message, code: err.code || 'ERR' };
    metrics.errors++;
  }
});

router.get('/api/students', async (ctx) => {
  const { limit = 10, offset = 0, group_name, course } = ctx.query;
  const key = `students:${limit}:${offset}:${group_name || ''}:${course || ''}`;
  const cached = cacheGet(key);
  if (cached) return (ctx.body = cached);

  const where = [];
  const params = [];
  if (group_name) { where.push('group_name = ?'); params.push(group_name); }
  if (course) { where.push('course = ?'); params.push(Number(course)); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [cnt] = await query(`SELECT COUNT(*) AS total FROM students ${whereSql}`, params);
  const items = await query(
    `SELECT * FROM students ${whereSql} ORDER BY id LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  const result = {
    data: items,
    pagination: {
      total: cnt.total,
      limit: Number(limit),
      offset: Number(offset),
      pages: Math.ceil(cnt.total / Number(limit))
    }
  };
  cacheSet(key, result);
  ctx.body = result;
});

router.get('/api/students/stats', async (ctx) => {
  const key = 'students:stats';
  const cached = cacheGet(key);
  if (cached) return (ctx.body = cached);

  const [stats] = await query(`SELECT COUNT(*) AS total, AVG(grade) AS avgGrade FROM students`);
  const byGroup = await query(`SELECT group_name, COUNT(*) AS count FROM students GROUP BY group_name`);
  const result = {
    total: stats.total,
    averageGrade: Number(stats.avgGrade || 0).toFixed(2),
    byGroup: Object.fromEntries(byGroup.map((r) => [r.group_name, r.count]))
  };
  cacheSet(key, result);
  ctx.body = result;
});

router.get('/api/students/:id', async (ctx) => {
  const rows = await query('SELECT * FROM students WHERE id = ?', [ctx.params.id]);
  if (!rows.length) { ctx.status = 404; ctx.body = { error: 'Не найден' }; return; }
  ctx.body = rows[0];
});

router.post('/api/students', async (ctx) => {
  const { name, group_name, course, grade } = ctx.request.body;
  if (!name || !group_name || !course) {
    ctx.status = 400; ctx.body = { error: 'name, group_name, course обязательны' }; return;
  }
  const r = await query(
    'INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)',
    [name, group_name, course, grade ?? null]
  );
  cacheInvalidate('students:');
  ctx.status = 201;
  ctx.body = { id: r.insertId, name, group_name, course, grade };
});

router.put('/api/students/:id', async (ctx) => {
  const { name, group_name, course, grade } = ctx.request.body || {};
  const fields = [];
  const values = [];
  for (const [k, v] of Object.entries({ name, group_name, course, grade })) {
    if (v !== undefined) { fields.push(`${k} = ?`); values.push(v); }
  }
  if (!fields.length) { ctx.status = 400; ctx.body = { error: 'Нет полей' }; return; }
  values.push(ctx.params.id);
  const r = await query(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`, values);
  if (!r.affectedRows) { ctx.status = 404; ctx.body = { error: 'Не найден' }; return; }
  cacheInvalidate('students:');
  ctx.body = { updated: r.affectedRows };
});

router.delete('/api/students/:id', async (ctx) => {
  const r = await query('DELETE FROM students WHERE id = ?', [ctx.params.id]);
  if (!r.affectedRows) { ctx.status = 404; ctx.body = { error: 'Не найден' }; return; }
  cacheInvalidate('students:');
  ctx.body = { deleted: true };
});

router.post('/api/students/batch', async (ctx) => {
  const items = ctx.request.body;
  if (!Array.isArray(items) || !items.length) {
    ctx.status = 400; ctx.body = { error: 'Нужен массив студентов' }; return;
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const s of items) {
      if (!s.name || !s.group_name || !s.course) {
        throw new Error('Не все обязательные поля заполнены');
      }
      await conn.query(
        'INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)',
        [s.name, s.group_name, s.course, s.grade ?? null]
      );
    }
    await conn.commit();
    cacheInvalidate('students:');
    ctx.body = { created: items.length, transaction: 'committed' };
  } catch (e) {
    await conn.rollback();
    ctx.status = 400;
    ctx.body = { error: e.message, transaction: 'rolled back' };
  } finally {
    conn.release();
  }
});

router.get('/api/metrics', (ctx) => {
  const total = metrics.cacheHits + metrics.cacheMisses;
  ctx.body = {
    queries: metrics.queries,
    avgTime: metrics.queries ? (metrics.totalTime / metrics.queries).toFixed(1) : 0,
    errors: metrics.errors,
    cacheHitRate: total ? (metrics.cacheHits / total).toFixed(2) : 0
  };
});

router.get('/api/cache/stats', (ctx) => {
  ctx.body = { size: cache.size, ttl: TTL / 1000 };
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(PORT, () => {
  console.log(`[INFO] Koa-сервер запущен на порту ${PORT}`);
  console.log(`[INFO] Группа: ${GROUP}`);
});