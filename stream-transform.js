const { Readable, Transform, Writable } = require('stream');

const GROUP = 'ББМО-01-23';
const PREFIX = `[${GROUP}]`;


class UpperCaseTransform extends Transform {
  _transform(chunk, enc, cb) {
    cb(null, `${PREFIX} ${chunk.toString().toUpperCase()}`);
  }
}


class JsonParserTransform extends Transform {
  constructor() {
    super({ objectMode: true });
  }
  _transform(chunk, enc, cb) {
    try {
      const obj = JSON.parse(chunk.toString());
      cb(null, obj);
    } catch (e) {
      cb(new Error('Невалидный JSON: ' + e.message));
    }
  }
}


class FilterTransform extends Transform {
  constructor(predicate) {
    super({ objectMode: true });
    this.predicate = predicate;
  }
  _transform(obj, enc, cb) {
    if (this.predicate(obj)) cb(null, obj);
    else cb();
  }
}

class LogWritable extends Writable {
  constructor() {
    super({ objectMode: true });
  }
  _write(obj, enc, cb) {
    console.log(`  → ${JSON.stringify(obj)}`);
    cb();
  }
}


console.log('== Transform-поток UpperCase ==\n');

const stringSource = Readable.from(['hello', 'streams', 'world']);

stringSource
  .pipe(new UpperCaseTransform())
  .pipe(new Writable({
    write(chunk, enc, cb) {
      console.log(chunk.toString());
      cb();
    }
  }))
  .on('finish', demoJson);


function demoJson() {
  console.log('\n== Object Mode: JSON → фильтр → вывод ==\n');

  const jsonLines = [
    '{"id":1,"name":"Иванов","group":"ББМО-01-23"}',
    '{"id":2,"name":"Петров","group":"ББМО-02-23"}',
    '{"id":3,"name":"Сидоров","group":"ББМО-01-23"}'
  ];

  const source = Readable.from(jsonLines);

  source
    .pipe(new JsonParserTransform())
    .pipe(new FilterTransform((obj) => obj.group === GROUP))
    .pipe(new LogWritable())
    .on('finish', demoAsyncIterator);
}


async function demoAsyncIterator() {
  console.log('\n== Async Iterator (for await) ==\n');

  const source = Readable.from(['a', 'b', 'c']);
  for await (const chunk of source) {
    console.log(`  получил: ${chunk}`);
  }
  console.log('  поток завершён');
}