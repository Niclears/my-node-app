
require('dotenv').config();
const mysql = require('mysql2');

const GROUP = 'ББМО-01-23';
const BASE = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

const pool = mysql.createPool({ ...BASE, connectionLimit: 10 });
pool.on('error', (err) => console.log(`[POOL ERROR] ${err.code}`));


function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function getConnection() {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, conn) => (err ? reject(err) : resolve(conn)));
  });
}

function connQuery(conn, sql, params = []) {
  return new Promise((resolve, reject) => {
    conn.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}


async function demoErrors() {
  console.log('=== Демонстрация ошибок ===\n');


  await new Promise((resolve) => {
    const c = mysql.createConnection({ ...BASE, port: 9999 });
    c.on('error', (err) => {
      console.log(`[${err.code}] Сервер недоступен: localhost:9999`);
      resolve();
    });
    c.connect(() => {});
  });


  await new Promise((resolve) => {
    const c = mysql.createConnection({ ...BASE, password: 'wrong' });
    c.on('error', (err) => {
      console.log(`[${err.code}] Неверный пароль для пользователя ${BASE.user}`);
      resolve();
    });
    c.connect(() => {});
  });


  try {
    await query('SELECT * FRM students');
  } catch (e) {
    console.log(`[${e.code}] Синтаксическая ошибка: SELECT * FRM students`);
  }


  try {
    await query(`CREATE TABLE IF NOT EXISTS uniq_test (
      id INT PRIMARY KEY,
      val VARCHAR(20)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await query('INSERT INTO uniq_test (id, val) VALUES (?, ?)', [1, 'a']);
    await query('INSERT INTO uniq_test (id, val) VALUES (?, ?)', [1, 'b']);
  } catch (e) {
    console.log(`[${e.code}] Дублирование ключа: id=1`);
  }


  try {
    await query('INSERT INTO students (name, group_name, course) VALUES (?, ?, ?)',
      [null, GROUP, 1]);
  } catch (e) {
    console.log(`[${e.code}] NULL в NOT NULL столбце: name`);
  }

  console.log('');
}


async function streamDemo() {
  console.log('=== Потоковый запрос ===\n');

  await query(`CREATE TABLE IF NOT EXISTS big_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    val INT
  ) ENGINE=InnoDB`);

  const cnt = await query('SELECT COUNT(*) AS c FROM big_data');

  if (cnt[0].c < 10000) {
    console.log('Заполняем big_data (10 000 записей)...');
    const conn = await getConnection();
    try {
      await connQuery(conn, 'START TRANSACTION');
      for (let i = 0; i < 10000; i++) {
        await connQuery(conn, 'INSERT INTO big_data (val) VALUES (?)',
          [Math.floor(Math.random() * 1000)]);
      }
      await connQuery(conn, 'COMMIT');
    } finally {
      conn.release();
    }
  }

  console.log('Чтение 10 000 записей через .stream()...');
  const t0 = Date.now();
  let processed = 0;

  await new Promise((resolve, reject) => {
    const stream = pool.query('SELECT * FROM big_data').stream();
    stream.on('data', () => {
      processed++;
      if (processed % 2500 === 0) {
        console.log(`[STREAM] Получено: ${processed} (${processed / 100}%)`);
      }
    });
    stream.on('end', () => {
      const dt = ((Date.now() - t0) / 1000).toFixed(2);
      console.log(`✔ Обработано за ${dt} сек\n`);
      resolve();
    });
    stream.on('error', reject);
  });
}


async function transactionDemo() {
  console.log('=== Транзакция ===\n');

  const conn = await getConnection();
  try {
    await connQuery(conn, 'START TRANSACTION');
    console.log('Начало транзакции');

    await connQuery(conn,
      'INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)',
      ['Тест1', GROUP, 1, 4.0]);
    console.log('✔ INSERT 1 выполнен');

    await connQuery(conn,
      'INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)',
      ['Тест2', GROUP, 1, 4.1]);
    console.log('✔ INSERT 2 выполнен');

    await connQuery(conn,
      'INSERT INTO students (name, group_name, course) VALUES (?, ?, ?)',
      [null, GROUP, 1]);
    console.log('✔ INSERT 3 выполнен (не должен случиться)');

    await connQuery(conn, 'COMMIT');
    console.log('Commit выполнен');
  } catch (e) {
    await connQuery(conn, 'ROLLBACK');
    console.log(`✖ INSERT 3 не выполнен (${e.code})`);
    console.log('Rollback выполнен');
  } finally {
    conn.release();
    console.log('Соединение возвращено в пул');
  }
}


(async () => {
  try {
    await demoErrors();
    await streamDemo();
    await transactionDemo();
  } catch (e) {
    console.error(`[${e.code || 'ERR'}] ${e.message}`);
  } finally {
    pool.end();
  }
})();