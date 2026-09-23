// ЛР16, Задание 3: middleware — логирование, сжатие, rate limit, ошибки
const express = require('express');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(express.json());


app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
             + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    console.log(`[${ts}] ${req.method} ${req.path} ${res.statusCode} - ${ms}ms`);
  });
  next();
});


app.use(compression());


const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много запросов, попробуйте позже', status: 429 }
});
app.use(limiter);


let books = [
  { id: 1, title: 'Война и мир', author: 'Толстой', year: 1869 }
];
let nextId = 2;

app.get('/', (req, res) => {
  res.json({ message: 'Сервер работает' });
});

app.get('/books', (req, res) => {
  res.json(books);
});

app.post('/books', (req, res) => {
  const { title, author, year } = req.body || {};
  if (!title || !author || year === undefined) {
    return res.status(400).json({ error: 'Все поля обязательны: title, author, year' });
  }
  const book = { id: nextId++, title, author, year };
  books.push(book);
  res.status(201).json(book);
});


app.get('/error', (req, res) => {
  throw new Error('Тестовая ошибка');
});

app.get('/async-error', async (req, res, next) => {
  try {
    await Promise.reject(new Error('Асинхронная ошибка'));
  } catch (e) {
    next(e);
  }
});


app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Внутренняя ошибка сервера',
    status
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Сервер: http://localhost:${PORT}`);
  console.log('  /           — открытый');
  console.log('  /books      — список книг');
  console.log('  /error      — тест ошибки 500');
  console.log('  /async-error — тест async-ошибки');
});