const fs = require('fs').promises;
const path = require('path');

const VARIANT = 9;
const REPORT = path.join(__dirname, `report_${VARIANT}.json`);


const IGNORE_DIRS = new Set(['node_modules', '.git']);

const stats = {
  dirs: 0,
  files: 0,
  totalBytes: 0,
  byExt: {},        // { '.js': { count, bytes } }
  all: []           // [{ path, size }]
};

function extOf(name) {
  const e = path.extname(name).toLowerCase();
  return e || '(без расширения)';
}

function fmtBytes(b) {
  if (b < 1024) return `${b} байт`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(2)} КБ`;
  return `${(b / (1024 * 1024)).toFixed(2)} МБ`;
}

async function scan(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      stats.dirs++;
      await scan(full);
    } else if (entry.isFile()) {
      const st = await fs.stat(full);
      stats.files++;
      stats.totalBytes += st.size;

      const e = extOf(entry.name);
      if (!stats.byExt[e]) stats.byExt[e] = { count: 0, bytes: 0 };
      stats.byExt[e].count++;
      stats.byExt[e].bytes += st.size;

      stats.all.push({ path: full, size: st.size });
    }
  }
}

async function main() {
  const target = process.argv[2] || process.cwd();
  console.log(`Анализ директории: ${target}\n`);

  await scan(target);

  console.log(`Общее количество папок: ${stats.dirs}`);
  console.log(`Общее количество файлов: ${stats.files}`);
  console.log(`Общий размер: ${fmtBytes(stats.totalBytes)} (${stats.totalBytes} байт)`);

  console.log('\nРасширения файлов:');
  Object.entries(stats.byExt)
    .sort((a, b) => b[1].bytes - a[1].bytes)
    .forEach(([ext, v]) => {
      console.log(`  ${ext}: ${v.count} файлов (${fmtBytes(v.bytes)})`);
    });

  const sorted = [...stats.all].sort((a, b) => b.size - a.size);
  console.log('\nТоп-5 самых больших:');
  sorted.slice(0, 5).forEach((f, i) => {
    console.log(`  ${i + 1}. ${path.basename(f.path)} (${fmtBytes(f.size)}) — ${f.path}`);
  });

  console.log('\nТоп-5 самых маленьких:');
  sorted.slice(-5).reverse().forEach((f, i) => {
    console.log(`  ${i + 1}. ${path.basename(f.path)} (${fmtBytes(f.size)}) — ${f.path}`);
  });

  const report = {
    target,
    dirs: stats.dirs,
    files: stats.files,
    totalBytes: stats.totalBytes,
    byExt: stats.byExt,
    top5Largest: sorted.slice(0, 5),
    top5Smallest: sorted.slice(-5).reverse()
  };
  await fs.writeFile(REPORT, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nОтчет сохранён: report_${VARIANT}.json`);
}

main().catch((e) => console.error('Ошибка:', e.message));