const { Writable } = require('stream');

const GROUP = 'ББМО-01-23';

class SlowWritable extends Writable {
  constructor(options = {}) {
    super(options);
    this.total = 0;
  }

  _write(chunk, encoding, callback) {
    const text = chunk.toString().trim();
    console.log(`[WRITE] ${text}`);
    this.total++;
    setTimeout(() => {
      callback();
    }, 50);
  }
}

console.log('=== Демонстрация Writable-потока ===\n');

const writer = new SlowWritable({ highWaterMark: 16 });

writer.on('drain', () => {
  console.log('[DRAIN] Буфер освобождён, продолжаем запись');
});

writer.on('finish', () => {
  console.log('[FINISH] Все данные записаны');
  console.log(`\nВсего записано: ${writer.total} чанка`);
});

writer.on('error', (err) => {
  console.error('[ERROR]', err.message);
});

const items = [
  `Группа: ${GROUP}`,
  'Студент: Иванов Иван',
  'Лабораторная работа: №21',
  'Тема: Потоки в Node.js'
];

for (const item of items) {
  const ok = writer.write(item + '\n');
  console.log(`write() вернул: ${ok}${ok ? '' : '  ← буфер переполнен!'}\n`);
}

writer.end();