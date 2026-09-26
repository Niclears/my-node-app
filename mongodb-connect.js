require('dotenv').config();
const { MongoClient } = require('mongodb');

const URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB || 'bbmo_01_23';

async function main() {
  console.log('=== Подключение к MongoDB ===\n');
  const client = new MongoClient(URI);

  client.on('serverHeartbeatSucceeded', () => {
    console.log(`[HEARTBEAT] Успешно: ${new Date().toISOString()}`);
  });
  client.on('serverHeartbeatFailed', (e) => {
    console.log(`[HEARTBEAT] Провал: ${e.failure?.message || 'error'}`);
  });

  try {
    await client.connect();
    console.log('✔ Подключение установлено');

    const admin = client.db('admin');
    const db = client.db(DB_NAME);
    await db.command({ ping: 1 });

    const buildInfo = await admin.command({ buildInfo: 1 });
    console.log(`Версия MongoDB: ${buildInfo.version}`);
    console.log(`База данных: ${DB_NAME}`);
    console.log(`Пользователь: ${URI.split('//')[1].split(':')[0]}`);

    console.log('\n=== Информация о сервере ===');
    const { databases } = await admin.command({ listDatabases: 1 });
    console.log('Список БД:');
    databases.forEach((d) => console.log(`  - ${d.name}`));

    const collections = await db.listCollections().toArray();
    console.log(`\nКоллекции в ${DB_NAME}:`);
    if (!collections.length) console.log('  (пусто — БД создана лениво)');
    else collections.forEach((c) => console.log(`  - ${c.name}`));

    console.log('\n=== Heartbeat ===');
    await new Promise((r) => setTimeout(r, 11000));
    console.log('✔ Соединение стабильно');
  } catch (err) {
    console.error(`✘ Ошибка подключения: ${err.message}`);
  } finally {
    await client.close();
    console.log('\n✔ Соединение закрыто');
  }
}

main();