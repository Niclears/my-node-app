const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const readline = require('readline');

const VARIANT = 9;
const DATA = path.join(__dirname, `data_${VARIANT}.txt`);
const PROCESSED = path.join(__dirname, `processed_${VARIANT}.txt`);

const LINES = 100000;


async function generateFile() {
  try {
    await fsp.access(DATA);
    console.log(`Файл уже существует: ${path.basename(DATA)}`);
    return;
  } catch {}

  const stream = fs.createWriteStream(DATA, { encoding: 'utf8' });
  for (let i = 1; i <= LINES; i++) {
    const n = Math.floor(Math.random() * 1000) + 1;
    stream.write(`${i}, ${n}, Вариант ${VARIANT}\n`);
  }
  await new Promise((res, rej) => {
    stream.end((err) => (err ? rej(err) : res()));
  });
  const st = await fsp.stat(DATA);
  console.log(`Создан файл: ${path.basename(DATA)} (${(st.size / 1024 / 1024).toFixed(2)} МБ)`);
}


async function processFile() {
  const st = await fsp.stat(DATA);
  console.log(`\nОбработка файла: ${path.basename(DATA)}`);
  console.log(`Размер файла: ${(st.size / 1024 / 1024).toFixed(2)} МБ\n`);

  const start = Date.now();

  const rl = readline.createInterface({
    input: fs.createReadStream(DATA, { highWaterMark: 64 * 1024 }),
    crlfDelay: Infinity
  });

  let count = 0, sum = 0, min = Infinity, max = -Infinity;
  let even = 0, odd = 0;
  let progressMark = 0;

  for await (const line of rl) {
    const parts = line.split(',');
    if (parts.length < 2) continue;
    const n = Number(parts[1].trim());
    if (Number.isNaN(n)) continue;

    count++;
    sum += n;
    if (n < min) min = n;
    if (n > max) max = n;
    if (n % 2 === 0) even++; else odd++;

    const pct = Math.floor((count / LINES) * 100);
    if (pct >= progressMark + 10) {
      progressMark = pct - (pct % 10);
      console.log(`Прогресс: ${progressMark}% (${count.toLocaleString('ru-RU')} строк)`);
    }
  }

  const avg = count ? sum / count : 0;
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);

  const result = [
    `Обработка файла: ${path.basename(DATA)}`,
    `Всего строк: ${count.toLocaleString('ru-RU')}`,
    `Сумма чисел: ${sum.toLocaleString('ru-RU')}`,
    `Среднее значение: ${avg.toFixed(2)}`,
    `Максимальное число: ${max}`,
    `Минимальное число: ${min}`,
    `Четных чисел: ${even.toLocaleString('ru-RU')}`,
    `Нечетных чисел: ${odd.toLocaleString('ru-RU')}`,
    `Время выполнения: ${elapsed} сек`
  ].join('\n');

  console.log('\nОбработка завершена!\n');
  console.log('Результаты:');
  console.log(result);
  await fsp.writeFile(PROCESSED, result + '\n', 'utf8');
  console.log(`\nРезультаты сохранены в: ${path.basename(PROCESSED)}`);
}

async function main() {
  await generateFile();
  await processFile();
}

main().catch((e) => console.error('Ошибка:', e.message));