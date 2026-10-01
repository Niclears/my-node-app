require('dotenv').config();
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'student',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bbmo_01_23'
};

async function singleConnection() {
  console.log('=== Одиночное соединение ===\n');
  let conn;
  try {
    conn = await mysql.createConnection(config);
    console.log('✔ Подключение установлено');

    const [versionRows] = await conn.query('SELECT VERSION() AS v');
    console.log(`Версия MySQL: ${versionRows[0].v}`);

    const [dbRows] = await conn.query('SELECT DATABASE() AS db');
    console.log(`Текущая БД: ${dbRows[0].db}`);

    const [userRows] = await conn.query('SELECT USER() AS u');
    console.log(`Пользователь: ${userRows[0].u}`);
  } catch (err) {
    console.log(`✘ Ошибка подключения [${err.code}]: ${err.message}`);
  } finally {
    if (conn) {
      await conn.end();
      console.log('✘ Соединение закрыто\n');
    }
  }
}

async function poolConnection() {
  console.log('=== Пул соединений ===\n');
  const pool = mysql.createPool({ ...config, connectionLimit: Number(process.env.DB_POOL_LIMIT) || 10 });

  try {
    const conn = await pool.getConnection();
    console.log(`✔ Пул создан (лимит: ${pool.pool.config.connectionLimit})`);

    const [versionRows] = await conn.query('SELECT VERSION() AS v');
    console.log(`Версия MySQL: ${versionRows[0].v}`);

    const [dbRows] = await conn.query('SELECT DATABASE() AS db');
    console.log(`Текущая БД: ${dbRows[0].db}`);

    conn.release();
    console.log(`Соединений в пуле: ${pool.pool._allConnections.length}`);
    console.log('✔ Пул готов к работе');
  } catch (err) {
    console.log(`✘ Ошибка пула [${err.code}]: ${err.message}`);
  } finally {
    await pool.end();
  }
}

async function demoError() {
  console.log('\n=== Демонстрация ошибки подключения ===\n');
  try {
    await mysql.createConnection({
      ...config,
      password: 'неверный-пароль'
    });
  } catch (err) {
    console.log(`[${err.code}] ${err.message}`);
  }
}

(async () => {
  await singleConnection();
  await poolConnection();
  await demoError();
})();