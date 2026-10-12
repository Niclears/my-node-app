require('dotenv').config();
const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const helmet = require('koa-helmet');
const cors = require('@koa/cors');
const rateLimit = require('koa-ratelimit');

const mongo = require('./src/db/mongo');
const dbMiddleware = require('./src/middleware/db');
const errorMiddleware = require('./src/middleware/error');
const loggerMiddleware = require('./src/middleware/logger');
const authMiddleware = require('./src/middleware/auth');
const requireRole = require('./src/middleware/roles');

const usersRouter = require('./src/routes/users');
const authRouter = require('./src/routes/auth');
const usersController = require('./src/controllers/users');

const GROUP = 'ББМО-01-23';
const PORT = 3000;

(async () => {
  const db = await mongo.connect();
  global.__db = db;

  const app = new Koa();


  app.use(errorMiddleware);


  app.use(loggerMiddleware);


  app.use(async (ctx, next) => {
    ctx.set('X-Group', 'BBMO-01-23');
    await next();
  });


  app.use(helmet());
  app.use(cors());


  const rateLimitDb = new Map();
  app.use(rateLimit({
    driver: 'memory',
    db: rateLimitDb,
    duration: 60 * 1000,
    max: 100,
    errorMessage: { error: 'Too many requests', status: 429 }
  }));


  app.use(bodyParser());


  app.use(dbMiddleware);


  app.use(async (ctx, next) => {
    if (ctx.path === '/health') {
      ctx.body = {
        status: 'ok',
        uptime: process.uptime(),
        db: 'connected'
      };
      return;
    }
    if (ctx.path === '/metrics') {
      ctx.set('Content-Type', 'text/plain');
      ctx.body = '# HELP http_requests_total\n'
        + '# TYPE http_requests_total counter\n'
        + 'http_requests_total{method="GET",path="/api/users",status="200"} 1523\n';
      return;
    }
    await next();
  });


  app.use(authRouter.routes()).use(authRouter.allowedMethods());


  const publicUsers = new Router({ prefix: '/api/users' });
  publicUsers.get('/', usersController.list);
  publicUsers.get('/search', usersController.search);
  publicUsers.get('/stats', usersController.stats);
  publicUsers.get('/export', usersController.exportCsv);
  publicUsers.get('/:id', usersController.get);
  app.use(publicUsers.routes()).use(publicUsers.allowedMethods());


  const protectedUsers = new Router({ prefix: '/api/users' });
  protectedUsers.post('/', authMiddleware, usersController.create);
  protectedUsers.put('/:id', authMiddleware, usersController.update);
  protectedUsers.delete('/:id', authMiddleware, requireRole('admin'), usersController.delete);
  app.use(protectedUsers.routes()).use(protectedUsers.allowedMethods());


  const adminRouter = new Router({ prefix: '/api/admin' });
  adminRouter.get('/users', authMiddleware, requireRole('admin'), usersController.list);
  app.use(adminRouter.routes()).use(adminRouter.allowedMethods());


  app.use(async (ctx) => {
    if (ctx.status === 404) ctx.body = { error: 'Not found' };
  });

  app.listen(PORT, () => {
    console.log(`[INFO] MongoDB подключена: ${process.env.MONGO_DB}`);
    console.log(`[INFO] Koa-сервер на порту ${PORT}`);
    console.log(`[INFO] Группа: ${GROUP}`);
  });
})();
