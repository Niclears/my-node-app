const fs = require('fs');
const path = require('path');
const { Readable, Transform, Writable, pipeline } = require('stream');

const GROUP = 'ББМО-01-23';
const TOTAL = 10000;
const CSV_OUT = path.join(__dirname, 'students.csv');
const ERR_LOG = path.join(__dirname, 'errors.log');
const TIMEOUT_MS = 10000;

const stats = { generated: 0, validated: 0, enriched: 0, filtered: 0, written: 0, errors: 0 };

function now() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
       + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function logError(msg) {
  fs.appendFileSync(ERR_LOG, `[${now()}] [${GROUP}] ${msg}\n`, 'utf8');
}

class StudentSource extends Readable {
  constructor() {
    super({ objectMode: true, highWaterMark: 100 });
    this.generated = 0;
  }
  _read() {
    if (this.generated >= TOTAL) {
      this.push(null);
      return;
    }
    for (let i = 0; i < 100 && this.generated < TOTAL; i++) {
      this.generated++;
      const id = this.generated;
      const student = {
        id,
        name: `Студент_${id}`,
        group: GROUP,
        course: (id % 4) + 1,
        grade: Math.floor(Math.random() * 5) + 1 // 1..5
      };
     
      if (id % 137 === 0) student.name = undefined;
      this.push(student);
    }
  }
}


class ValidateTransform extends Transform {
  constructor() {
    super({ objectMode: true, highWaterMark: 50 });
  }
  _transform(obj, enc, cb) {
    if (!obj.name) {
      stats.errors++;
      logError(`Ошибка валидации: id=${obj.id}, отсутствует name`);
      return cb();
    }
    if (typeof obj.grade !== 'number' || obj.grade < 1 || obj.grade > 5) {
      stats.errors++;
      logError(`Ошибка валидации: id=${obj.id}, некорректный grade`);
      return cb();
    }
    stats.validated++;
    cb(null, obj);
  }
}


class EnrichTransform extends Transform {
  constructor() {
    super({ objectMode: true, highWaterMark: 50 });
  }
  _transform(obj, enc, cb) {
    obj.averageGrade = Number(((obj.grade + 5) / 2).toFixed(2));
    stats.enriched++;
    cb(null, obj);
  }
}

class FilterTransform extends Transform {
  constructor() {
    super({ objectMode: true, highWaterMark: 50 });
  }
  _transform(obj, enc, cb) {
    if (obj.grade > 3) {
      stats.filtered++;
      cb(null, obj);
    } else {
      cb();
    }
  }
}


class FormatTransform extends Transform {
  constructor() {
    super({ objectMode: true, highWaterMark: 50 });
  }
  _transform(obj, enc, cb) {
    cb(null, `${obj.id},${obj.name},${obj.group},${obj.course},${obj.grade},${obj.averageGrade}\n`);
  }
}


class CsvWriter extends Writable {
  constructor(file, total) {
    super({ highWaterMark: 32 });
    this.file = file;
    this.total = total;
    this.count = 0;
    this.paused = 0;
    this.stream = fs.createWriteStream(file, { encoding: 'utf8' });
    this.stream.write('id,name,group,course,grade,averageGrade\n');
  }
  _write(chunk, enc, cb) {
    this.count++;
    stats.written++;
    if (this.count % 1000 === 0 || this.count === this.total) {
      const pct = Math.min(100, Math.round((this.count / this.total) * 100));
      console.log(`[PROGRESS] ${pct}% | ${this.count}/${this.total} | записано: ${stats.written}`);
    }
    this.stream.write(chunk, (err) => {
      if (err) return cb(err);
      cb();
    });
  }
  _final(cb) {
    this.stream.end(cb);
  }
}

async function run() {
  console.log(`=== Конвейер обработки данных (группа ${GROUP}) ===`);
  console.log(`Источник: ${TOTAL} студентов`);
  console.log('Фильтр: оценка > 3\n');

  if (fs.existsSync(CSV_OUT)) fs.unlinkSync(CSV_OUT);
  if (fs.existsSync(ERR_LOG)) fs.unlinkSync(ERR_LOG);

  const t0 = Date.now();

  const source = new StudentSource();
  const validator = new ValidateTransform();
  const enricher = new EnrichTransform();
  const filter = new FilterTransform();
  const formatter = new FormatTransform();
  const writer = new CsvWriter(CSV_OUT, TOTAL);

  // Таймаут 10 сек
  const timer = setTimeout(() => {
    console.log('\n✖ Таймаут! Обработка отменена');
    source.destroy(new Error('timeout'));
    validator.destroy();
    enricher.destroy();
    filter.destroy();
    formatter.destroy();
    writer.destroy();
    console.log('✔ Все потоки корректно закрыты');
    console.log('✔ Ресурсы освобождены');
  }, TIMEOUT_MS);

  await new Promise((resolve) => {
    pipeline(source, validator, enricher, filter, formatter, writer, (err) => {
      clearTimeout(timer);
      if (err) {
        console.log(`✖ Ошибка pipeline: ${err.message}`);
        logError(`Ошибка pipeline: ${err.message}`);
      }
      resolve();
    });
  });

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const size = fs.existsSync(CSV_OUT) ? (fs.statSync(CSV_OUT).size / 1024 / 1024).toFixed(2) : 0;

  console.log('\n=== Результаты ===');
  console.log(`Всего сгенерировано:  ${stats.generated}`);
  console.log(`Прошло валидацию:     ${stats.validated}`);
  console.log(`Обогащено:            ${stats.enriched}`);
  console.log(`Отфильтровано:        ${stats.filtered}`);
  console.log(`Записано в CSV:       ${stats.written}`);
  console.log(`Ошибок:               ${stats.errors}`);
  console.log(`Время выполнения:     ${elapsed} сек`);
  console.log(`Средняя скорость:     ${Math.round(stats.written / elapsed)} записей/сек`);
  console.log(`\nФайл: students.csv (${size} МБ)`);
}

run();