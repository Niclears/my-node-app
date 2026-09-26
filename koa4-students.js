// ЛР15, Задание 4: CRUD студентов + фильтрация по query-параметру group
const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
const router = new Router();

let students = [
  { id: 1, name: 'Анна', group: 'ББМО-01-23', course: 2 },
  { id: 2, name: 'Иван', group: 'ББМО-01-23', course: 1 },
  { id: 3, name: 'Пётр', group: 'ББМО-02-23', course: 3 }
];
let nextId = 4;

function validate(body) {
  if (!body || typeof body !== 'object') return 'Тело запроса отсутствует';
  if (!body.name) return 'Поле name обязательно';
  if (!body.group) return 'Поле group обязательно';
  if (body.course === undefined) return 'Поле course обязательно';
  if (typeof body.course !== 'number') return 'Поле course должно быть числом';
  return null;
}


router.get('/students', (ctx) => {
  const { group } = ctx.query;
  let result = students;
  if (group) {
    result = students.filter((s) => s.group === group);
  }
  ctx.body = result;
});


router.get('/students/:id', (ctx) => {
  const student = students.find((s) => s.id === Number(ctx.params.id));
  if (!student) {
    ctx.status = 404;
    ctx.body = { error: 'Студент не найден' };
    return;
  }
  ctx.body = student;
});

router.post('/students', (ctx) => {
  const err = validate(ctx.request.body);
  if (err) {
    ctx.status = 400;
    ctx.body = { error: err };
    return;
  }
  const student = {
    id: nextId++,
    name: ctx.request.body.name,
    group: ctx.request.body.group,
    course: ctx.request.body.course
  };
  students.push(student);
  ctx.status = 201;
  ctx.body = student;
});


router.put('/students/:id', (ctx) => {
  const student = students.find((s) => s.id === Number(ctx.params.id));
  if (!student) {
    ctx.status = 404;
    ctx.body = { error: 'Студент не найден' };
    return;
  }
  const body = ctx.request.body || {};
  if (body.name !== undefined) student.name = body.name;
  if (body.group !== undefined) student.group = body.group;
  if (body.course !== undefined) student.course = body.course;
  ctx.body = student;
});


router.delete('/students/:id', (ctx) => {
  const idx = students.findIndex((s) => s.id === Number(ctx.params.id));
  if (idx === -1) {
    ctx.status = 404;
    ctx.body = { error: 'Студент не найден' };
    return;
  }
  const [removed] = students.splice(idx, 1);
  ctx.body = { message: `Студент #${removed.id} удалён`, student: removed };
});

app.use(bodyParser());
app.use(router.routes()).use(router.allowedMethods());

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Сервер: http://localhost:${PORT}/students`);
});