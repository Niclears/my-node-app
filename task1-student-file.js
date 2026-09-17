const fs = require('fs').promises;
const path = require('path');

const VARIANT = 9; 
const FILE = `student_${VARIANT}.txt`;


const favoriteBooks = [
  '1. "Мастер и Маргарита" — М. Булгаков',
  '2. "1984" — Дж. Оруэлл',
  '3. "Преступление и наказание" — Ф. Достоевский',
  '4. "Гарри Поттер" — Дж. Роулинг',
  '5. "Война и мир" — Л. Толстой'
];

function now() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
       + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function main() {
  const filePath = path.join(__dirname, FILE);

  try {

    const lines = [
      `Студент: Козлов Михаил Денисович`,
      `Группа: 401`,
      `Вариант: ${VARIANT}`,
      `Дата: ${now()}`,
      ``,
      `Любимые книги:`,
      ...favoriteBooks
    ];


    await fs.writeFile(filePath, lines.join('\n') + '\n', 'utf8');
    console.log(`Создан файл: ${FILE}`);

  
    const content = await fs.readFile(filePath, 'utf8');
    const lineCount = content.split('\n').filter((l) => l.trim() !== '').length;
    await fs.appendFile(filePath, `Количество записей: ${lineCount}\n`, 'utf8');

 
    const finalContent = await fs.readFile(filePath, 'utf8');
    console.log('\nСодержимое файла:\n');
    console.log(finalContent);
  } catch (err) {
    console.error('Ошибка:', err.message);
  }
}

main();