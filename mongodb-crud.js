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
    await col.createIndex({ group_name: 1 });

    console.log(`=== Коллекция students (группа ${GROUP}) ===\n`);

    console.log('--- INSERT ---');
    const r1 = await col.insertOne({
      name: 'Иван', group_name: GROUP, course: 1, grade: 4.5, created_at: new Date()
    });
    console.log(`✔ Вставлен: insertedId=${r1.insertedId}`);

    const r2 = await col.insertMany([
      { name: 'Мария', group_name: GROUP, course: 1, grade: 3.8, created_at: new Date() },
      { name: 'Пётр', group_name: GROUP, course: 2, grade: 4.2, created_at: new Date() },
      { name: 'Ольга', group_name: GROUP, course: 2, grade: 3.5, created_at: new Date() }
    ]);
    console.log(`✔ Вставлено 3 документа: count=${r2.insertedCount}\n`);

    console.log('--- SELECT ---');
    const all = await col.find({}).toArray();
    console.log(`Все документы (${all.length}):`);
    all.forEach((d) => console.log(`  { name: "${d.name}", grade: ${d.grade} }`));

    console.log(`\nС фильтром по группе:`);
    const filtered = await col.find({ group_name: GROUP }).toArray();
    filtered.forEach((d) => console.log(`  { name: "${d.name}", grade: ${d.grade} }`));

    console.log('\nС проекцией (name, grade):');
    const projected = await col.find({}, { projection: { name: 1, grade: 1, _id: 0 } }).toArray();
    projected.slice(0, 2).forEach((d) => console.log(`  ${JSON.stringify(d)}`));
    console.log('');

    console.log('--- UPDATE ---');
    const u1 = await col.updateOne({ name: 'Иван' }, { $set: { grade: 4.9 } });
    console.log(`✔ updateOne: matched=${u1.matchedCount}, modified=${u1.modifiedCount}`);
    const u2 = await col.updateMany({ group_name: GROUP }, { $inc: { course: 1 } });
    console.log(`✔ updateMany ($inc course+1): matched=${u2.matchedCount}\n`);

    console.log('--- DELETE ---');
    const d1 = await col.deleteOne({ name: 'Мария' });
    console.log(`✔ deleteOne: deletedCount=${d1.deletedCount}`);
    const d2 = await col.deleteMany({ grade: { $lt: 4 } });
    console.log(`✔ deleteMany (grade < 4): deletedCount=${d2.deletedCount}\n`);
  } catch (err) {
    console.error(`✘ Ошибка: ${err.message}`);
  } finally {
    await client.close();
  }
}

main();