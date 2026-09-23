// ЛР16, Задание 4: библиотека — фильтры, пагинация, сортировка, поиск
const express = require('express');

const app = express();
app.use(express.json());

let books = [
  { id: 1, title: 'Война и мир', author: 'Толстой', year: 1869, genre: 'роман' },
  { id: 2, title: 'Анна Каренина', author: 'Толстой', year: 1877, genre: 'роман' },
  { id: 3, title: 'Преступление и наказание', author: 'Достоевский', year: 1866, genre: 'роман' },
  { id: 4, title: 'Мастер и Маргарита', author: 'Булгаков', year: 1967, genre: 'роман' },
  { id: 5, title: '1984', author: 'Оруэлл', year: 1949, genre: 'антиутопия' }
];
let nextId = 6;

function validate(body, requireAll = true) {
  if (!body || typeof body !== 'object') return 'Тело запроса отсутствует';
  if (requireAll) {
    if (!body.title) return 'Поле title обязательно';
    if (!body.author) return 'Поле author обязательно';
    if (body.year === undefined) return 'Поле year обязательно';
  }
  if (body.year !== undefined && typeof body.year !== 'number') {
    return 'Поле year должно быть числом';
  }
  return null;
}


app.get('/api/books/stats', (req, res) => {
  const byAuthor = {};
  const byGenre = {};
  let minYear = Infinity, maxYear = -Infinity;
  for (const b of books) {
    byAuthor[b.author] = (byAuthor[b.author] || 0) + 1;
    if (b.genre) byGenre[b.genre] = (byGenre[b.genre] || 0) + 1;
    if (b.year < minYear) minYear = b.year;
    if (b.year > maxYear) maxYear = b.year;
  }
  res.json({
    total: books.length,
    byAuthor,
    byGenre,
    oldestYear: minYear === Infinity ? null : minYear,
    newestYear: maxYear === -Infinity ? null : maxYear
  });
});


app.get('/api/books', (req, res) => {
  let result = [...books];
  const { author, year, yearFrom, yearTo, limit, page, sort, search } = req.query;

  if (author) result = result.filter((b) => b.author.toLowerCase() === String(author).toLowerCase());
  if (year) result = result.filter((b) => b.year === Number(year));
  if (yearFrom) result = result.filter((b) => b.year >= Number(yearFrom));
  if (yearTo) result = result.filter((b) => b.year <= Number(yearTo));

  if (search) {
    const q = String(search).toLowerCase();
    result = result.filter((b) =>
      b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
    );
  }

  if (sort) {
    const desc = sort.startsWith('-');
    const field = desc ? sort.slice(1) : sort;
    if (['title', 'author', 'year', 'id'].includes(field)) {
      result.sort((a, b) => {
        const av = a[field], bv = b[field];
        if (av < bv) return desc ? 1 : -1;
        if (av > bv) return desc ? -1 : 1;
        return 0;
      });
    }
  }

  const total = result.length;
  const lim = limit !== undefined ? Math.max(0, Number(limit)) : 10;
  const pg = page !== undefined ? Math.max(1, Number(page)) : 1;
  const off = (pg - 1) * lim;
  const pageItems = result.slice(off, off + lim);

  res.json({
    total,
    page: pg,
    limit: lim,
    count: pageItems.length,
    items: pageItems
  });
});


app.get('/api/books/:id', (req, res) => {
  const book = books.find((b) => b.id === Number(req.params.id));
  if (!book) return res.status(404).json({ error: 'Книга не найдена' });
  res.json(book);
});


app.post('/api/books', (req, res) => {
  const err = validate(req.body, true);
  if (err) return res.status(400).json({ error: err });

  // Проверка на дубликат (title + author)
  const dup = books.find(
    (b) =>
      b.title.toLowerCase() === req.body.title.toLowerCase() &&
      b.author.toLowerCase() === req.body.author.toLowerCase()
  );
  if (dup) return res.status(409).json({ error: 'Такая книга уже есть' });

  const book = {
    id: nextId++,
    title: req.body.title,
    author: req.body.author,
    year: req.body.year,
    genre: req.body.genre || null
  };
  books.push(book);
  res.status(201).json(book);
});


app.put('/api/books/:id', (req, res) => {
  const book = books.find((b) => b.id === Number(req.params.id));
  if (!book) return res.status(404).json({ error: 'Книга не найдена' });

  const err = validate(req.body, false);
  if (err) return res.status(400).json({ error: err });

  const body = req.body;
  if (body.title !== undefined) book.title = body.title;
  if (body.author !== undefined) book.author = body.author;
  if (body.year !== undefined) book.year = body.year;
  if (body.genre !== undefined) book.genre = body.genre;

  res.json(book);
});


app.delete('/api/books/:id', (req, res) => {
  const idx = books.findIndex((b) => b.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Книга не найдена' });
  const [removed] = books.splice(idx, 1);
  res.json({ message: `Книга #${removed.id} удалена`, book: removed });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API: http://localhost:${PORT}/api/books`);
  console.log(`Статистика: http://localhost:${PORT}/api/books/stats`);
});