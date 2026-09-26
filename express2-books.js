// ЛР16, Задание 2: CRUD книг через REST API
const express = require('express');

const app = express();
app.use(express.json());

let books = [
  { id: 1, title: 'Война и мир', author: 'Толстой', year: 1869 },
  { id: 2, title: 'Преступление и наказание', author: 'Достоевский', year: 1866 }
];
let nextId = 3;

function findById(id) {
  return books.find((b) => b.id === Number(id));
}

function validate(body) {
  if (!body || typeof body !== 'object') return 'Тело запроса отсутствует';
  if (!body.title) return 'Поле title обязательно';
  if (!body.author) return 'Поле author обязательно';
  if (body.year === undefined) return 'Поле year обязательно';
  if (typeof body.year !== 'number') return 'Поле year должно быть числом';
  return null;
}


app.get('/api/books/search', (req, res) => {
  const { author } = req.query;
  if (!author) return res.json(books);
  const result = books.filter((b) =>
    b.author.toLowerCase().includes(String(author).toLowerCase())
  );
  res.json(result);
});


app.get('/api/books', (req, res) => {
  res.json(books);
});


app.get('/api/books/:id', (req, res) => {
  const book = findById(req.params.id);
  if (!book) return res.status(404).json({ error: 'Книга не найдена' });
  res.json(book);
});


app.post('/api/books', (req, res) => {
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });

  const book = {
    id: nextId++,
    title: req.body.title,
    author: req.body.author,
    year: req.body.year
  };
  books.push(book);
  res.status(201).json(book);
});


app.put('/api/books/:id', (req, res) => {
  const book = findById(req.params.id);
  if (!book) return res.status(404).json({ error: 'Книга не найдена' });

  const body = req.body || {};
  if (body.title !== undefined) book.title = body.title;
  if (body.author !== undefined) book.author = body.author;
  if (body.year !== undefined) {
    if (typeof body.year !== 'number') {
      return res.status(400).json({ error: 'Поле year должно быть числом' });
    }
    book.year = body.year;
  }
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
  console.log(`REST API: http://localhost:${PORT}/api/books`);
});