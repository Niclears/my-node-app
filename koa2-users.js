// ЛР15, Задание 2: CRUD для пользователей через REST API
const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
const router = new Router({ prefix: '/api' });

let users = [
  { id: 1, name: 'Иванов Иван', group: 'ББМО-01-23' },
  { id: 2, name: 'Петров Петр', group: 'ББМО-02-23' }
];
let nextId = 3;


function findById(id) {
  return users.find((u) => u.id === Number(id));
}

function validate(body) {
  if (!body || typeof body !== 'object') return 'Тело запроса отсутствует';
  if (!body.name || typeof body.name !== 'string') return 'Поле name обязательно';
  if (!body.group || typeof body.group !== 'string') return 'Поле group обязательно';
  return null;
}

router.get('/users', (ctx) => {
  ctx.body = users;
});


router.get('/users/:id', (ctx) => {
  const user = findById(ctx.params.id);
  if (!user) {
    ctx.status = 404;
    ctx.body = { error: 'Пользователь не найден' };
    return;
  }
  ctx.body = user;
});


router.post('/users', (ctx) => {
  const err = validate(ctx.request.body);
  if (err) {
    ctx.status = 400;
    ctx.body = { error: err };
    return;
  }
  const user = {
    id: nextId++,
    name: ctx.request.body.name,
    group: ctx.request.body.group
  };
  users.push(user);
  ctx.status = 201;
  ctx.body = user;
});


router.put('/users/:id', (ctx) => {
  const user = findById(ctx.params.id);
  if (!user) {
    ctx.status = 404;
    ctx.body = { error: 'Пользователь не найден' };
    return;
  }
  const err = validate(ctx.request.body);
  if (err) {
    ctx.status = 400;
    ctx.body = { error: err };
    return;
  }
  user.name = ctx.request.body.name;
  user.group = ctx.request.body.group;
  ctx.body = user;
});


router.delete('/users/:id', (ctx) => {
  const user = findById(ctx.params.id);
  if (!user) {
    ctx.status = 404;
    ctx.body = { error: 'Пользователь не найден' };
    return;
  }
  users = users.filter((u) => u.id !== user.id);
  ctx.body = { message: `Пользователь #${user.id} удалён` };
});

app.use(bodyParser());
app.use(router.routes()).use(router.allowedMethods());

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`REST API: http://localhost:${PORT}/api/users`);
});