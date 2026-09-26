// ЛР16, Задание 5: полное REST API с JWT, генерацией 100 книг, отзывами
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());

const JWT_SECRET = 'dev-secret-change-me';


const TITLES = ['Война и мир', 'Анна Каренина', 'Преступление и наказание', 'Мастер и Маргарита',
  '1984', 'Скотный двор', 'Тихий Дон', 'Доктор Живаго', 'Отцы и дети', 'Мёртвые души',
  'Герой нашего времени', 'Евгений Онегин', 'Капитанская дочка', 'Ревизор', 'Шинель',
  'Обломов', 'Гроза', 'Вишнёвый сад', 'Три сестры', 'Дядя Ваня'];
const AUTHORS = ['Толстой', 'Достоевский', 'Булгаков', 'Оруэлл', 'Шолохов', 'Пастернак',
  'Тургенев', 'Гоголь', 'Лермонтов', 'Пушкин', 'Чехов', 'Гончаров', 'Островский'];
const GENRES = ['роман', 'повесть', 'рассказ', 'антиутопия', 'драма', 'поэма'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateBooks(count = 100) {
  const result = [];
  for (let i = 1; i <= count; i++) {
    result.push({
      id: i,
      title: `${pick(TITLES)} (изд. ${i})`,
      author: pick(AUTHORS),
      year: 1800 + Math.floor(Math.random() * 225),
      genre: pick(GENRES),
      isbn: `978-5-${String(100000 + i).padStart(6, '0')}-${i % 10}`,
      available: Math.random() > 0.3,
      reviews: []
    });
  }
  return result;
}

let books = generateBooks(100);
let nextBookId = books.length + 1;

const users = [
  {
    id: 1,
    email: 'admin@example.com',
    name: 'Администратор',
    role: 'admin',
    passwordHash: bcrypt.hashSync('admin123', 10)
  }
];
let nextUserId = 2;

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}


function authRequired(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Требуется токен' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Недействительный токен' });
  }
}

function adminRequired(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ только для администраторов' });
  }
  next();
}

app.post('/auth/register', async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Поля email, password, name обязательны' });
  }
  if (users.find((u) => u.email === email)) {
    return res.status(409).json({ error: 'Пользователь уже существует' });
  }
  const user = {
    id: nextUserId++,
    email,
    name,
    role: 'user',
    passwordHash: await bcrypt.hash(password, 10)
  };
  users.push(user);
  res.status(201).json({ message: 'Зарегистрирован', id: user.id, email: user.email });
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = users.find((u) => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }
  res.json({ token: signToken(user), user: { id: user.id, email: user.email, role: user.role } });
});

app.get('/api/books', authRequired, (req, res) => {
  let result = [...books];
  const { author, year, yearFrom, yearTo, limit, page, sort, search, available } = req.query;

  if (author) result = result.filter((b) => b.author === author);
  if (year) result = result.filter((b) => b.year === Number(year));
  if (yearFrom) result = result.filter((b) => b.year >= Number(yearFrom));
  if (yearTo) result = result.filter((b) => b.year <= Number(yearTo));
  if (available === 'true') result = result.filter((b) => b.available);
  if (search) {
    const q = String(search).toLowerCase();
    result = result.filter((b) =>
      b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
  }
  if (sort) {
    const desc = sort.startsWith('-');
    const field = desc ? sort.slice(1) : sort;
    result.sort((a, b) => {
      const av = a[field], bv = b[field];
      if (av < bv) return desc ? 1 : -1;
      if (av > bv) return desc ? -1 : 1;
      return 0;
    });
  }

  const total = result.length;
  const lim = limit !== undefined ? Math.max(1, Number(limit)) : 10;
  const pg = page !== undefined ? Math.max(1, Number(page)) : 1;
  const items = result.slice((pg - 1) * lim, (pg - 1) * lim + lim);

  res.json({ total, page: pg, limit: lim, count: items.length, items });
});

app.get('/api/books/available', authRequired, (req, res) => {
  res.json(books.filter((b) => b.available));
});

app.get('/api/books/recommendations', authRequired, (req, res) => {
  const genre = req.query.genre;
  if (!genre) return res.status(400).json({ error: 'Укажите genre' });
  res.json(books.filter((b) => b.genre === genre).slice(0, 10));
});

app.get('/api/books/export', authRequired, (req, res) => {
  const format = (req.query.format || 'json').toLowerCase();
  if (format === 'csv') {
    const header = 'id,title,author,year,genre,isbn,available';
    const rows = books.map((b) =>
      [b.id, `"${b.title}"`, b.author, b.year, b.genre, b.isbn, b.available].join(','));
    res.type('text/csv').send([header, ...rows].join('\n'));
  } else {
    res.json(books);
  }
});

app.get('/api/books/:id', authRequired, (req, res) => {
  const book = books.find((b) => b.id === Number(req.params.id));
  if (!book) return res.status(404).json({ error: 'Книга не найдена' });
  res.json(book);
});

app.post('/api/books', authRequired, adminRequired, (req, res) => {
  const { title, author, year } = req.body || {};
  if (!title || !author || year === undefined) {
    return res.status(400).json({ error: 'Поля title, author, year обязательны' });
  }
  const book = {
    id: nextBookId++,
    title, author, year,
    genre: req.body.genre || null,
    isbn: req.body.isbn || `978-5-${nextBookId}`,
    available: true,
    reviews: []
  };
  books.push(book);
  res.status(201).json(book);
});

app.put('/api/books/:id', authRequired, (req, res) => {
  const book = books.find((b) => b.id === Number(req.params.id));
  if (!book) return res.status(404).json({ error: 'Книга не найдена' });
  const body = req.body || {};
  ['title', 'author', 'year', 'genre', 'isbn', 'available'].forEach((k) => {
    if (body[k] !== undefined) book[k] = body[k];
  });
  res.json(book);
});

app.delete('/api/books/:id', authRequired, adminRequired, (req, res) => {
  const idx = books.findIndex((b) => b.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Книга не найдена' });
  const [removed] = books.splice(idx, 1);
  res.json({ message: `Книга #${removed.id} удалена`, book: removed });
});

app.post('/api/books/:id/reviews', authRequired, (req, res) => {
  const book = books.find((b) => b.id === Number(req.params.id));
  if (!book) return res.status(404).json({ error: 'Книга не найдена' });
  const { rating, text } = req.body || {};
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating — число от 1 до 5' });
  }
  const review = {
    id: book.reviews.length + 1,
    user: req.user.email,
    rating,
    text: text || '',
    date: new Date().toISOString()
  };
  book.reviews.push(review);
  res.status(201).json(review);
});


app.get('/api/admin/stats', authRequired, adminRequired, (req, res) => {
  res.json({
    users: users.length,
    books: books.length,
    available: books.filter((b) => b.available).length,
    totalReviews: books.reduce((s, b) => s + b.reviews.length, 0)
  });
});


app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Внутренняя ошибка сервера', status });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Сервер: http://localhost:${PORT}`);
  console.log(`  POST /auth/register`);
  console.log(`  POST /auth/login`);
  console.log(`  GET  /api/books (JWT)`);
  console.log(`  POST /api/books (JWT + admin)`);
  console.log(`Тестовый админ: admin@example.com / admin123`);
});