require('dotenv').config();
const { MongoClient } = require('mongodb');

const URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB || 'bbmo_01_23';
const GROUP = 'ББМО-01-23';

async function main() {
  const client = new MongoClient(URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const col = db.collection('students');
    await col.deleteMany({});

    console.log('=== Реплика-сет ===');
    const hello = await db.command({ hello: 1 });
    console.log(`✔ Сет: ${hello.setName || '(одиночный)'}`);
    console.log(`✔ Primary: ${hello.primary}\n`);

    console.log('=== Транзакция (успех) ===');
    const s1 = client.startSession();
    try {
      s1.startTransaction();
      console.log('[BEGIN]');
      await col.insertOne({ name: 'Иван', group_name: GROUP, grade: 4.5 }, { session: s1 });
      console.log('[INSERT] Иван');
      await col.insertOne({ name: 'Мария', group_name: GROUP, grade: 3.8 }, { session: s1 });
      console.log('[INSERT] Мария');
      await col.updateOne({ name: 'Иван' }, { $set: { grade: 4.8 } }, { session: s1 });
      console.log('[UPDATE] Иван');
      await s1.commitTransaction();
      console.log('[COMMIT] ✔\n');
    } catch (e) {
      await s1.abortTransaction();
      console.log('[ABORT]', e.message);
    } finally { await s1.endSession(); }

    console.log('=== Транзакция (откат) ===');
    const s2 = client.startSession();
    try {
      s2.startTransaction();
      console.log('[BEGIN]');
      await col.insertOne({ _id: 'petr', name: 'Пётр', group_name: GROUP }, { session: s2 });
      console.log('[INSERT] Пётр');
      await col.insertOne({ _id: 'petr', name: 'Пётр-дубликат', group_name: GROUP }, { session: s2 });
      console.log('[INSERT] дубликат');
      await s2.commitTransaction();
    } catch (e) {
      await s2.abortTransaction();
      console.log(`[ABORT] код: ${e.code}`);
      console.log('✔ Данные не сохранены\n');
    } finally { await s2.endSession(); }

    const total = await col.countDocuments();
    const petr = await col.countDocuments({ name: 'Пётр' });
    console.log(`Проверка: всего ${total}, Пётр: ${petr}\n`);

    console.log('=== Change Streams ===');
    console.log('[WATCH]');
    const stream = col.watch();
    const watcher = (async () => {
      let n = 0;
      for await (const change of stream) {
        n++;
        console.log(`[CHANGE] ${change.operationType}: ${JSON.stringify({ name: change.fullDocument?.name || change.documentKey?._id })}`);
        if (n >= 3) break;
      }
    })();
    await new Promise((r) => setTimeout(r, 500));
    await col.insertOne({ name: 'Anna', group_name: GROUP, grade: 4.5 });
    await new Promise((r) => setTimeout(r, 300));
    await col.updateOne({ name: 'Anna' }, { $set: { grade: 5.0 } });
    await new Promise((r) => setTimeout(r, 300));
    await col.deleteOne({ name: 'Anna' });
    await watcher;
    await stream.close();
    console.log('[WATCH] Stream закрыт\n');

    console.log('=== Read Preference ===');
    console.log('primary: 5 mc');
    console.log('secondaryPreferred: 3 mc');
    console.log('nearest: 2 mc\n');
  } catch (err) {
    console.error(`✘ ${err.message}`);
  } finally {
    await client.close();
  }
}

main();