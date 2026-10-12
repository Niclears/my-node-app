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

    const cnt = await col.countDocuments();
    if (cnt < 10000) {
      console.log('Наполняем (10 000 документов)...');
      const docs = [];
      for (let i = 0; i < 10000; i++) {
        docs.push({
          name: `Студент_${i}`,
          group_name: ['ББМО-01-23', 'ББМО-02-23', 'ББМО-03-23'][i % 3],
          course: (i % 4) + 1,
          grade: Math.round((2 + Math.random() * 3) * 100) / 100
        });
      }
      await col.insertMany(docs);
      console.log('✔ Наполнено\n');
    }

    console.log('=== Курсоры ===');
    console.log('for await:');
    const t0 = Date.now();
    let count = 0;
    for await (const doc of col.find({}).batchSize(1000)) count++;
    console.log(`  Получено ${count} за ${((Date.now() - t0) / 1000).toFixed(2)} сек\n`);

    console.log('=== Агрегации ===');
    const avg = await col.aggregate([
      { $group: { _id: '$group_name', avgGrade: { $avg: '$grade' } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    console.log('Средний балл по группам:');
    avg.forEach((g) => console.log(`  ${g._id}: ${g.avgGrade.toFixed(2)}`));

    const courses = await col.aggregate([
      { $group: { _id: '$course', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    console.log('\nКоличество по курсам:');
    courses.forEach((c) => console.log(`  ${c._id}: ${c.count}`));

    const groups = db.collection('groups');
    await groups.deleteMany({});
    await groups.insertOne({ group_name: GROUP, curator: 'Иванов И.И.' });
    const lookup = await col.aggregate([
      { $match: { group_name: GROUP } },
      { $limit: 1 },
      { $lookup: { from: 'groups', localField: 'group_name', foreignField: 'group_name', as: 'g' } },
      { $project: { group_name: 1, curator: { $arrayElemAt: ['$g.curator', 0] } } }
    ]).toArray();
    console.log('\n$lookup:');
    console.log(`  ${JSON.stringify(lookup[0])}\n`);

    console.log('=== Индексы ===');
    await col.createIndex({ group_name: 1 }, { name: 'group_name_1' });
    console.log('✔ group_name_1');
    await col.createIndex({ group_name: 1, grade: -1 }, { name: 'group_name_1_grade_-1' });
    console.log('✔ group_name_1_grade_-1');
    await col.createIndex({ email: 1 }, { unique: true, sparse: true, name: 'email_1' });
    console.log('✔ уникальный email_1');

    const ex = await col.find({ group_name: GROUP }).explain('executionStats');
    console.log('\nexplain():');
    console.log(`  time: ${ex.executionStats.executionTimeMillis} ms`);
    console.log(`  docs: ${ex.executionStats.totalDocsExamined}\n`);

    console.log('=== Текстовый поиск ===');
    await col.createIndex({ name: 'text' }, { name: 'name_text' });
    console.log('✔ индекс name_text');
    const found = await col.find({ $text: { $search: 'Студент_1' } }).toArray();
    console.log(`  Найдено: ${found.length}`);
  } catch (err) {
    console.error(`✘ ${err.message}`);
  } finally {
    await client.close();
  }
}

main();