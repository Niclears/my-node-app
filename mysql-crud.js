require('dotenv').config();
const mysql = require('mysql2/promise');

const GROUP = 'ББМО-01-23';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: Number(process.env.DB_POOL_LIMIT) || 10
});

async function createTable() {
  console.log('=== Создание таблицы ===\n');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS students (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      group_name VARCHAR(20) NOT NULL,
      course INT NOT NULL,
      grade DECIMAL(3,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('✔ Таблица students создана\n');
}

async function insertData() {
  console.log('=== INSERT ===\n');

  const [r1] = await pool.query(
    'INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)',
    ['Иван', GROUP, 1, 4.5]
  );
  console.log(`✔ Вставлен студент: id=${r1.insertId}, affectedRows=${r1.affectedRows}`);

  const [r2] = await pool.query(
    'INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)',
    ['Мария', GROUP, 1, 3.8,
     'Пётр', GROUP, 2, 4.2,
     'Ольга', GROUP, 2, 3.5]
  );
  console.log(`✔ Вставлено 3 студента: affectedRows=${r2.affectedRows}\n`);
}

async function selectData() {
  console.log('=== SELECT ===\n');

  const [all] = await pool.query('SELECT id, name, group_name, grade FROM students');
  console.log('Все студенты:');
  all.forEach((s) => console.log(`  id=${s.id}, name=${s.name}, group=${s.group_name}, grade=${s.grade}`));

  console.log(`\nСтуденты группы ${GROUP} (сортировка по grade):`);
  const [filtered] = await pool.query(
    'SELECT id, name, grade FROM students WHERE group_name = ? ORDER BY grade DESC',
    [GROUP]
  );
  filtered.forEach((s) => console.log(`  id=${s.id}, name=${s.name}, grade=${s.grade}`));

  console.log('\nПагинация (LIMIT 2 OFFSET 0):');
  const [page] = await pool.query('SELECT id, name FROM students LIMIT ? OFFSET ?', [2, 0]);
  page.forEach((s) => console.log(`  id=${s.id}, name=${s.name}`));
  console.log('');
}

async function updateData() {
  console.log('=== UPDATE ===\n');
  const [r1] = await pool.query('UPDATE students SET grade = ? WHERE id = ?', [4.9, 1]);
  console.log(`✔ Обновлён студент id=1: affectedRows=${r1.affectedRows}, changedRows=${r1.changedRows}`);

  const [r2] = await pool.query('UPDATE students SET grade = ? WHERE id = ?', [4.9, 1]);
  console.log(`✔ Повторное обновление: affectedRows=${r2.affectedRows}, changedRows=${r2.changedRows}\n`);
}

async function deleteData() {
  console.log('=== DELETE ===\n');
  const [r] = await pool.query('DELETE FROM students WHERE id = ?', [4]);
  console.log(`✔ Удалён студент id=4: affectedRows=${r.affectedRows}\n`);
}

async function injectionDemo() {
  console.log('=== Защита от SQL-инъекции ===\n');
  const malicious = "'; DROP TABLE students; --";
  console.log(`Попытка инъекции: "${malicious}"`);

  // Безопасно — параметризованный запрос
  const [safe] = await pool.query('SELECT * FROM students WHERE name = ?', [malicious]);
  console.log(`✔ Параметризованный запрос безопасен (найдено: ${safe.length})`);
  console.log('✖ Конкатенация привела бы к удалению таблицы\n');
}

(async () => {
  try {
    await createTable();
    await insertData();
    await selectData();
    await updateData();
    await deleteData();
    await injectionDemo();
  } catch (err) {
    console.error(`[${err.code}] ${err.message}`);
  } finally {
    await pool.end();
  }
})();