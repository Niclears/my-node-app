
const fs = require('fs');
const path = require('path');
const { pipeline, Transform } = require('stream');

const GROUP = 'ББМО-01-23';
const INPUT = path.join(__dirname, 'input.txt');
const PIPE_OUT = path.join(__dirname, 'output-pipe.txt');
const PIPELINE_OUT = path.join(__dirname, 'output-pipeline.txt');
const CHAIN_OUT = path.join(__dirname, 'output-chain.txt');


function demoSafePipe() {
  console.log('== Демонстрация pipe() ==');
  console.log(`Чтение: ${path.basename(INPUT)}`);
  console.log(`Запись: ${path.basename(PIPE_OUT)}`);
  const rs = fs.createReadStream(INPUT);
  const ws = fs.createWriteStream(PIPE_OUT);
  rs.pipe(ws);
  ws.on('finish', () => {
    const size = fs.statSync(PIPE_OUT).size;
    console.log('✔ Копирование завершено');
    console.log(`Размер: ${size} байт\n`);
    demoErrorPipe();
  });
}

function demoErrorPipe() {
  console.log('== Демонстрация pipe() с ошибкой ==');
  const missing = path.join(__dirname, 'missing.txt');
  const out = path.join(__dirname, 'output-pipe-err.txt');
  console.log(`Чтение: missing.txt`);
  const rs = fs.createReadStream(missing);
  const ws = fs.createWriteStream(out);

  rs.on('error', (err) => {
    console.log(`✖ Ошибка: ${err.code}`);
    console.log('△ Внимание: pipe() не закрыл целевой поток!');
    console.log('△ Возможна утечка памяти.\n');
    // Закроем вручную, чтобы процесс завершился
    ws.end();
    demoSafePipeline();
  });

  rs.pipe(ws);
}


function demoSafePipeline() {
  console.log('== Демонстрация pipeline() ==');
  console.log(`Чтение: ${path.basename(INPUT)}`);
  console.log(`Запись: ${path.basename(PIPELINE_OUT)}`);
  pipeline(
    fs.createReadStream(INPUT),
    fs.createWriteStream(PIPELINE_OUT),
    (err) => {
      if (err) {
        console.log('✖ Ошибка:', err.message);
        return;
      }
      console.log('✔ Копирование завершено\n');
      demoErrorPipeline();
    }
  );
}

function demoErrorPipeline() {
  console.log('== Демонстрация pipeline() с ошибкой ==');
  console.log(`Чтение: missing.txt`);
  pipeline(
    fs.createReadStream(path.join(__dirname, 'missing.txt')),
    fs.createWriteStream(path.join(__dirname, 'output-pipeline-err.txt')),
    (err) => {
      if (err) {
        console.log(`✖ Ошибка: ${err.code}`);
        console.log('✔ Все потоки автоматически закрыты');
        console.log('✔ Утечек нет\n');
        demoChain();
      }
    }
  );
}

class UpperCase extends Transform {
  _transform(chunk, enc, cb) {
    cb(null, chunk.toString().toUpperCase());
  }
}

class Reverse extends Transform {
  _transform(chunk, enc, cb) {
    cb(null, chunk.toString().split('').reverse().join(''));
  }
}

function demoChain() {
  console.log('== Цепочка потоков ==');
  console.log('input.txt → uppercase → reverse → output-chain.txt');

  // Создаём короткий осмысленный input для наглядности
  fs.writeFileSync(INPUT, 'hello streams\n');

  pipeline(
    fs.createReadStream(INPUT),
    new UpperCase(),
    new Reverse(),
    fs.createWriteStream(CHAIN_OUT),
    (err) => {
      if (err) {
        console.log('✖ Ошибка:', err.message);
        return;
      }
      const content = fs.readFileSync(CHAIN_OUT, 'utf8');
      console.log('✔ Обработка завершена');
      console.log(`Содержимое ${path.basename(CHAIN_OUT)}: ${content.trim()}\n`);
    }
  );
}

demoSafePipe();