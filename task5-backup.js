const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const VARIANT = 9;
const SRC = path.join(__dirname, `source_${VARIANT}`);
const BAK = path.join(__dirname, `backup_${VARIANT}`);

const TEXT_EXT = new Set(['.txt', '.js', '.json']);
const IMG_EXT = new Set(['.jpg', '.png', '.gif']);


async function createTestStructure() {
  await fsp.rm(SRC, { recursive: true, force: true });
  await fsp.mkdir(SRC, { recursive: true });

  const files = [
    ['readme.txt', '.txt'],
    ['script.js', '.js'],
    ['config.json', '.json'],
    ['image1.jpg', '.jpg'],
    ['image2.png', '.png'],
    ['image3.gif', '.gif']
  ];
  for (let i = 1; i <= 20; i++) {
    const ext = files[i % files.length][1];
    files.push([`file_${i}${ext}`, ext]);
  }

  const manifest = [];
  for (const [name, ext] of files) {
    const size = 100 + Math.floor(Math.random() * 2000);
    const content = 'A'.repeat(size);
    const filePath = path.join(SRC, name);
    await fsp.writeFile(filePath, content, 'utf8');
    manifest.push({ name, ext, size });
  }


  for (const sub of ['docs', 'assets', 'scripts']) {
    const subPath = path.join(SRC, sub);
    await fsp.mkdir(subPath, { recursive: true });
    for (let i = 1; i <= 3; i++) {
      const name = `${sub}_${i}.txt`;
      const content = `Файл ${name} в подпапке ${sub}\n`;
      await fsp.writeFile(path.join(subPath, name), content, 'utf8');
      manifest.push({ name: `${sub}/${name}`, ext: '.txt', size: content.length });
    }
  }

  await fsp.writeFile(path.join(SRC, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`Создана исходная структура: source_${VARIANT} (${manifest.length} файлов)`);
}


function streamCopy(src, dst) {
  return new Promise((resolve, reject) => {
    const rs = fs.createReadStream(src);
    const ws = fs.createWriteStream(dst);
    rs.on('error', reject);
    ws.on('error', reject);
    ws.on('finish', resolve);
    rs.pipe(ws);
  });
}

async function copyRecursive(srcDir, dstDir, counters) {
  await fsp.mkdir(dstDir, { recursive: true });
  const entries = await fsp.readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const s = path.join(srcDir, entry.name);
    const d = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      await copyRecursive(s, d, counters);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (TEXT_EXT.has(ext)) {
        await streamCopy(s, d);
        counters.stream++;
      } else {
        await fsp.copyFile(s, d);
        counters.plain++;
      }
      counters.total++;
      console.log(`  [${counters.total}] ${path.relative(SRC, s)} — ${TEXT_EXT.has(ext) ? 'поток' : 'обычное'}`);
    }
  }
}


async function collectFiles(dir, base = '') {
  const map = new Map();
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.join(base, entry.name);
    if (entry.isDirectory()) {
      const sub = await collectFiles(full, rel);
      for (const [k, v] of sub) map.set(k, v);
    } else if (entry.isFile()) {
      const st = await fsp.stat(full);
      map.set(rel, { size: st.size, mtime: st.mtimeMs });
    }
  }
  return map;
}

async function syncReport() {
  const srcMap = await collectFiles(SRC);
  const bakMap = await collectFiles(BAK);

  const onlyInSrc = [];
  const onlyInBak = [];
  const changed = [];
  const same = [];

  for (const [k, v] of srcMap) {
    if (!bakMap.has(k)) onlyInSrc.push(k);
    else {
      const b = bakMap.get(k);
      if (b.size !== v.size || Math.abs(b.mtime - v.mtime) > 1000) changed.push(k);
      else same.push(k);
    }
  }
  for (const k of bakMap.keys()) {
    if (!srcMap.has(k)) onlyInBak.push(k);
  }

  const report = [
    `Сравнение source_${VARIANT} и backup_${VARIANT}`,
    `Совпадают: ${same.length}`,
    `Изменены: ${changed.length}${changed.length ? ' — ' + changed.join(', ') : ''}`,
    `Добавлены (только в source): ${onlyInSrc.length}${onlyInSrc.length ? ' — ' + onlyInSrc.join(', ') : ''}`,
    `Удалены (только в backup): ${onlyInBak.length}${onlyInBak.length ? ' — ' + onlyInBak.join(', ') : ''}`
  ].join('\n');

  console.log('\nСравнение директорий:\n' + report);
  await fsp.writeFile(path.join(__dirname, `sync_report_${VARIANT}.txt`), report + '\n', 'utf8');
  console.log(`\nОтчет сохранён: sync_report_${VARIANT}.txt`);
}

async function main() {
  const t0 = Date.now();

  await createTestStructure();

  await fsp.rm(BAK, { recursive: true, force: true });
  await fsp.mkdir(BAK, { recursive: true });

  console.log(`\nКопирование source_${VARIANT} → backup_${VARIANT}\n`);
  const counters = { total: 0, stream: 0, plain: 0 };
  await copyRecursive(SRC, BAK, counters);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`\nКопирование завершено!`);
  console.log(`  Всего файлов: ${counters.total}`);
  console.log(`  Потоковое копирование: ${counters.stream}`);
  console.log(`  Обычное копирование: ${counters.plain}`);
  console.log(`  Время: ${elapsed} сек`);

  await syncReport();
}

main().catch((e) => console.error('Ошибка:', e.message));