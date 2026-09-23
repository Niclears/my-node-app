// ЛР15, Задание 1
const Koa = require('koa');

const app = new Koa();


app.use(async (ctx) => {
  if (ctx.path === '/' && ctx.method === 'GET') {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} `
                  + `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    ctx.type = 'text/html; charset=utf-8';
    ctx.body = `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="utf-8">
        <title>Лабораторная работа №15</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; }
          h1 { color: #2c3e50; }
          .card { background: #f4f6f8; padding: 20px; border-radius: 8px; }
          .row { margin: 8px 0; }
          .label { font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Лабораторная работа №15</h1>
        <div class="card">
          <div class="row"><span class="label">Группа:</span> ББМО-01-23</div>
          <div class="row"><span class="label">Дата и время:</span> ${dateStr}</div>
          <div class="row"><span class="label">Студент:</span> Козлов Михаил Денисович</div>
        </div>
        <p>Добро пожаловать! Это базовый сервер на Koa.js.</p>
      </body>
      </html>
    `;
  } else {
    ctx.status = 404;
    ctx.body = 'Страница не найдена';
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});