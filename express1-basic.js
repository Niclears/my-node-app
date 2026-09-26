// ЛР16, Задание 1
const express = require('express');

const app = express();
const PORT = 3000;


function now() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
       + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function page(title, content) {
  return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; color: #2c3e50; }
        h1 { color: #1a73e8; }
        .card { background: #f4f6f8; padding: 20px; border-radius: 8px; margin: 16px 0; }
        ul { line-height: 1.8; }
        a { color: #1a73e8; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      ${content}
    </body>
    </html>
  `;
}


app.get('/', (req, res) => {
  res.send(page('Лабораторная работа №16', `
    <div class="card">
      <p><strong>Группа:</strong> ББМО-01-23</p>
      <p><strong>Студент:</strong> Козлов Михаил Денисович</p>
      <p><strong>Дата и время:</strong> ${now()}</p>
    </div>
    <p>Добро пожаловать! Это базовый сервер на Express.js.</p>
    <h2>Доступные маршруты</h2>
    <ul>
      <li><a href="/">/</a> — главная</li>
      <li><a href="/about">/about</a> — о разработчике</li>
      <li><a href="/contacts">/contacts</a> — контакты</li>
    </ul>
  `));
});


app.get('/about', (req, res) => {
  res.send(page('О разработчике', `
    <div class="card">
      <p><strong>ФИО:</strong> Козлов Михаил Денисович</p>
      <p><strong>Группа:</strong> ББМО-01-23</p>
      <p><strong>Вариант:</strong> 9</p>
      <p><strong>Лабораторная:</strong> №16, Express.js</p>
    </div>
    <p><a href="/">← На главную</a></p>
  `));
});


app.get('/contacts', (req, res) => {
  res.send(page('Контакты', `
    <div class="card">
      <p><strong>Email:</strong> student@example.com</p>
      <p><strong>GitHub:</strong> <a href="https://github.com/Niclears">Niclears</a></p>
    </div>
    <p><a href="/">← На главную</a></p>
  `));
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});