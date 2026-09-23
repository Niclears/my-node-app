// ЛР15, Задание 5
const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
const router = new Router();

const FIRST_NAMES = ['Александр', 'Анна', 'Иван', 'Мария', 'Пётр', 'Ольга', 'Дмитрий',
  'Екатерина', 'Сергей', 'Наталья', 'Алексей', 'Алиса', 'Николай', 'Татьяна', 'Андрей',
  'Юлия', 'Максим', 'Ксения', 'Роман', 'Елена'];
const LAST_NAMES = ['Иванов', 'Петров', 'Сидоров', 'Кузнецов', 'Смирнов', 'Попов',
  'Волков', 'Морозов', 'Новиков', 'Фёдоров', 'Михайлов', 'Белов', 'Тарасов', 'Жуков',
  'Орлов', 'Киселёв', 'Макаров', 'Никитин', 'Захаров', 'Соловьёв'];
const GROUPS = ['ББМО-01-23', 'ББМО-02-23', 'ББМО-03-23', 'ББМО-04-23'];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateStudents(count = 50) {
  const result = [];
  for (let i = 1; i <= count; i++) {
    const lastName = randomItem(LAST_NAMES);
    const firstName = randomItem(FIRST_NAMES);
    const group = randomItem(GROUPS);
   
    const groupMatch = group.match(/-(\d+)-/);
    const course = groupMatch ? Math.min(4, Number(groupMatch[1])) : 1;
    result.push({
      id: i,
      name: `${lastName} ${firstName}`,
      group,
      course
    });
  }
  return result;
}

let students = generateStudents(50);
let nextId = students.length + 1;


function validate(body, requireAll = true) {
  if (!body || typeof body !== 'object') return 'Тело запроса отсутствует';
  if (requireAll) {
    if (!body.name) return 'Поле name обязательно';
    if (!body.group) return 'Поле group обязательно';
    if (body.course === undefined) return 'Поле course обязательно';
  }
  if (body.course !== undefined && typeof body.course !== 'number') {
    return 'Поле course должно быть числом';
  }
  return null;
}


router.get('/students', (ctx) => {
  let result = [...students];
  const { limit, offset, sort, search } = ctx.query;

 
  if (search) {
    const q = String(search).toLowerCase();
    result = result.filter((s) => s.name.toLowerCase().includes(q));
  }

 
  if (sort) {
    const desc = sort.startsWith('-');
    const field = desc ? sort.slice(1) : sort;
    if (['name', 'course', 'group', 'id'].includes(field)) {
      result.sort((a, b) => {
        const av = a[field];
        const bv = b[field];
        if (av < bv) return desc ? 1 : -1;
        if (av > bv) return desc ? -1 : 1;
        return 0;
      });
    }
  }

  const total = result.length;


  const lim = limit !== undefined ? Math.max(0, Number(limit)) : 10;
  const off = offset !== undefined ? Math.max(0, Number(offset)) : 0;
  const page = result.slice(off, off + lim);

  ctx.body = {
    total,
    limit: lim,
    offset: off,
    count: page.length,
    items: page
  };
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
  const err = validate(ctx.request.body, true);
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
  const err = validate(ctx.request.body, false);
  if (err) {
    ctx.status = 400;
    ctx.body = { error: err };
    return;
  }
  const body = ctx.request.body;
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
  console.log(`Сгенерировано студентов: ${students.length}`);
});