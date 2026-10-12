require('dotenv').config();
const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const { MongoClient, ObjectId } = require('mongodb');
const { WebSocketServer } = require('ws');

const URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB || 'bbmo_01_23';
const GROUP = 'ББМО-01-23';
const PORT = 3000;
const WS_PORT = 3001;

const metrics = { queries: 0, errors: 0, totalTime: 0, cacheHits: 0, cacheMisses: 0 };

const cache = new Map();
const TTL = 60 * 1000;
function cacheGet(k) {
  const e = cache.get(k);
  if (!e) { metrics.cacheMisses++; return null; }
  if (Date.now() - e.t > TTL) { cache.delete(k); metrics.cacheMisses++; return null; }
  metrics.cacheHits++;
  return e.v;
}
function cacheSet(k, v) { cache.set(k, { v, t: Date.now() }); }
function cacheInvalidate(p) {
  for (const k of cache.keys()) if (k.startsWith(p)) cache.delete(k);
}

function validate(data, isUpdate = false) {
  const errs = [];
  const { name, group_name, course, grade } = data;
  if (!isUpdate || name !== undefined) {
    if (!name || typeof name !== 'string' || name.length < 2 || name.length > 100)
      errs.push('name: от 2 до 100 символов');
  }
  if (!isUpdate || group_name !== undefined) {
    if (!group_name || !/^ББМО-\d{2}-\d{2}$/.test(group_name))
      errs.push('group_name: формат ББМО-XX-XX');
  }
  if (!isUpdate || course !== undefined) {
    if (!Number.isInteger(course) || course < 1 || course > 4)
      errs.push('course: целое от 1 до 4');
  }
  if (grade !== undefined && grade !== null) {
    if (typeof grade !== 'number' || grade < 0 || grade > 5)
      errs.push('grade: от 0 до 5');
  }
  return errs;
}

async function timed(fn) {
  const t0 = Date.now();
  metrics.queries++;
  try { return await fn(); }
  catch (e) { metrics.errors++; throw e; }
  finally { metrics.totalTime += Date.now() - t0; }
}

(async () => {
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const col = db.collection('students');

  console.log(`[INFO] MongoDB подключена: ${DB_NAME}`);
  await col.createIndex({ group_name: 1 });
  await col.createIndex({ name: 'text' });
  console.log('[INFO] Индексы созданы: group_name_1, name_text');


  const wss = new WebSocketServer({ port: WS_PORT });
  console.log(`[INFO] WebSocket на порту ${WS_PORT}`);

  const changeStream = col.watch();
  changeStream.on('change', (change) => {
    const payload = {
      type: change.operationType,
      name: change.fullDocument?.name || change.documentKey?._id,
      ts: new Date().toISOString()
    };
    wss.clients.forEach((c) => {
      if (c.readyState === 1) c.send(JSON.stringify(payload));
    });
  });
  console.log('[INFO] Change Stream запущен');

 
  const StudentDAO = {
    async create(data) {
      const errs = validate(data);
      if (errs.length) throw new Error(errs.join('; '));
      const r = await timed(() => col.insertOne({ ...data, created_at: new Date() }));
      return { _id: r.insertedId, ...data };
    },
    async findById(id) {
      return timed(() => col.findOne({ _id: new ObjectId(id) }));
    },
    async findAll({ limit = 10, offset = 0, group_name, course, sort, search } = {}) {
      const filter = {};
      if (group_name) filter.group_name = group_name;
      if (course) filter.course = course;
      if (search) filter.$text = { $search: search };

      const total = await timed(() => col.countDocuments(filter));
      let cursor = col.find(filter);
      if (sort) {
        const desc = sort.startsWith('-');
        const field = desc ? sort.slice(1) : sort;
        cursor = cursor.sort({ [field]: desc ? -1 : 1 });
      } else {
        cursor = cursor.sort({ _id: 1 });
      }
      const items = await timed(() => cursor.skip(offset).limit(limit).toArray());
      return {
        items,
        total,
        page: Math.floor(offset / limit) + 1,
        pages: Math.ceil(total / limit)
      };
    },
    async update(id, data) {
      const errs = validate(data, true);
      if (errs.length) throw new Error(errs.join('; '));
      const r = await timed(() =>
        col.updateOne({ _id: new ObjectId(id) }, { $set: data }));
      return r.matchedCount ? this.findById(id) : null;
    },
    async delete(id) {
      const r = await timed(() => col.deleteOne({ _id: new ObjectId(id) }));
      return r.deletedCount > 0;
    },
    async getStats() {
      const stats = await timed(() => col.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            avgGrade: { $avg: '$grade' },
            minGrade: { $min: '$grade' },
            maxGrade: { $max: '$grade' }
          }
        }
      ]).toArray());
      const byGroup = await timed(() => col.aggregate([
        { $group: { _id: '$group_name', count: { $sum: 1 } } }
      ]).toArray());
      const s = stats[0] || { total: 0, avgGrade: 0, minGrade: null, maxGrade: null };
      return {
        total: s.total,
        avgGrade: Number(s.avgGrade || 0).toFixed(2),
        minGrade: s.minGrade,
        maxGrade: s.maxGrade,
        byGroup: Object.fromEntries(byGroup.map((g) => [g._id, g.count]))
      };
    },
    async batchCreate(items) {
      const errs = items.flatMap((it, i) => validate(it).map((e) => `[${i}] ${e}`));
      if (errs.length) throw new Error(errs.join('; '));

      const session = client.startSession();
      try {
        session.startTransaction();
        const docs = items.map((it) => ({ ...it, created_at: new Date() }));
        const r = await col.insertMany(docs, { session });
        await session.commitTransaction();
        return { inserted: r.insertedCount, transaction: 'committed' };
      } catch (e) {
        await session.abortTransaction();
        throw new Error(`Transaction failed: ${e.message}`);
      } finally {
        await session.endSession();
      }
    }
  };


  const app = new Koa();
  const router = new Router();
  app.use(bodyParser());

  app.use(async (ctx, next) => {
    ctx.set('X-Group', 'BBMO-01-23');
    const t0 = Date.now();
    try { await next(); }
    finally {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
               + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      console.log(`[${ts}] [${GROUP}] ${ctx.method} ${ctx.url} ${ctx.status} (${Date.now() - t0}ms)`);
    }
  });

  app.use(async (ctx, next) => {
    try { await next(); }
    catch (e) {
      ctx.status = e.code === 11000 ? 409 : 400;
      ctx.body = { error: e.message, code: e.code || 'ERR' };
    }
  });

  router.get('/api/students', async (ctx) => {
    const { limit = 10, offset = 0, group_name, course, sort, search } = ctx.query;
    const key = `students:${limit}:${offset}:${group_name || ''}:${course || ''}:${sort || ''}:${search || ''}`;
    const cached = cacheGet(key);
    if (cached) return (ctx.body = cached);
    const result = await StudentDAO.findAll({
      limit: Number(limit),
      offset: Number(offset),
      group_name,
      course: course ? Number(course) : undefined,
      sort,
      search
    });
    cacheSet(key, result);
    ctx.body = result;
  });

  router.get('/api/students/stats', async (ctx) => {
    const key = 'students:stats';
    const cached = cacheGet(key);
    if (cached) return (ctx.body = cached);
    const result = await StudentDAO.getStats();
    cacheSet(key, result);
    ctx.body = result;
  });

  router.get('/api/students/search', async (ctx) => {
    const q = ctx.query.q;
    if (!q) { ctx.status = 400; ctx.body = { error: 'Укажите q' }; return; }
    const result = await StudentDAO.findAll({ limit: 20, search: q });
    ctx.body = { found: result.total, data: result.items };
  });

  router.get('/api/students/:id', async (ctx) => {
    const s = await StudentDAO.findById(ctx.params.id);
    if (!s) { ctx.status = 404; ctx.body = { error: 'Не найден' }; return; }
    ctx.body = s;
  });

  router.post('/api/students', async (ctx) => {
    const s = await StudentDAO.create(ctx.request.body);
    cacheInvalidate('students:');
    ctx.status = 201;
    ctx.body = s;
  });

  router.put('/api/students/:id', async (ctx) => {
    const s = await StudentDAO.update(ctx.params.id, ctx.request.body);
    if (!s) { ctx.status = 404; ctx.body = { error: 'Не найден' }; return; }
    cacheInvalidate('students:');
    ctx.body = s;
  });

  router.delete('/api/students/:id', async (ctx) => {
    const ok = await StudentDAO.delete(ctx.params.id);
    if (!ok) { ctx.status = 404; ctx.body = { error: 'Не найден' }; return; }
    cacheInvalidate('students:');
    ctx.body = { deleted: true };
  });

  router.post('/api/students/batch', async (ctx) => {
    const items = ctx.request.body;
    if (!Array.isArray(items) || !items.length) {
      ctx.status = 400;
      ctx.body = { error: 'Нужен массив' };
      return;
    }
    const result = await StudentDAO.batchCreate(items);
    cacheInvalidate('students:');
    ctx.body = result;
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
    console.log(`[INFO] Koa-сервер на порту ${PORT}`);
    console.log(`[INFO] WebSocket на порту ${WS_PORT}`);
  });
})();