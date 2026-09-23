// ЛР15, Задание 3
const Koa = require('koa');
const Router = require('koa-router');

const app = new Koa();
const router = new Router();


app.use(async (ctx, next) => {
  const start = Date.now();
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} `
           + `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  await next();

  const ms = Date.now() - start;
  console.log(`[${ts}] ${ctx.method} ${ctx.path} - ${ms}ms`);
});


app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = {
      error: err.message || 'Внутренняя ошибка сервера',
      status: ctx.status
    };
    console.error('Ошибка:', err.message);
  }
});


async function authMiddleware(ctx, next) {
  const auth = ctx.headers['authorization'];
  if (!auth) {
    ctx.status = 401;
    ctx.body = { error: 'Требуется заголовок Authorization', status: 401 };
    return;
  }
  await next();
}


router.get('/', (ctx) => {
  ctx.body = { message: 'Сервер работает' };
});


router.get('/protected', authMiddleware, (ctx) => {
  ctx.body = { message: 'Доступ разрешён', auth: ctx.headers['authorization'] };
});


router.get('/error', () => {
  throw new Error('Внутренняя ошибка сервера');
});

app.use(router.routes()).use(router.allowedMethods());

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Сервер: http://localhost:${PORT}`);
  console.log('  /          — открытый');
  console.log('  /protected — нужен Authorization');
  console.log('  /error     — тест обработки ошибок');
});