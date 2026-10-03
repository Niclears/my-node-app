const { Readable } = require('stream');

const GROUP = 'ББМО-01-23';

const chunks = [
  `Группа: ${GROUP}`,
  'Студент: Козлов Михаил Денисович',
  'Лабораторная работа: №21',
  'Тема: Потоки в Node.js'
];

class MyReadable extends Readable {
  constructor(items) {
    super({ encoding: 'utf8' });
    this.items = items;
    this.index = 0;
  }

  _read() {
    if (this.index < this.items.length) {
      this.push(this.items[this.index++] + '\n');
    } else {
      this.push(null); // конец потока
    }
  }
}

const reader = new MyReadable(chunks);
let count = 0;

console.log('=== Демонстрация Readable-потока ===\n');

reader.on('data', (chunk) => {
  count++;
  console.log(`[CHUNK ${count}] ${chunk.trim()}`);
});

reader.on('end', () => {
  console.log(`\n[END] Поток завершён. Всего получено чанков: ${count}`);
});

reader.on('error', (err) => {
  console.error('[ERROR]', err.message);
});