const fs = require('fs').promises;
const path = require('path');

const VARIANT = 9;
const ROOT = path.join(__dirname, `project_${VARIANT}`);


const structure = {
  'src': 'Исходный код проекта',
  'src/modules': 'Модули приложения',
  'src/components': 'Компоненты UI',
  'src/utils': 'Утилиты и вспомогательные функции',
  'data': 'Данные проекта',
  'data/input': 'Входные данные',
  'data/output': 'Выходные данные',
  'data/temp': 'Временные файлы'
};

async function createDir(dir, description) {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'info.txt'), `${description}\n`, 'utf8');
}

async function printTree(dir, prefix = '') {
  const items = await fs.readdir(dir, { withFileTypes: true });
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isLast = i === items.length - 1;
    const branch = isLast ? '└── ' : '├── ';
    console.log(prefix + branch + item.name);
    if (item.isDirectory()) {
      await printTree(path.join(dir, item.name), prefix + (isLast ? '    ' : '│   '));
    }
  }
}

async function main() {
  try {

   for (const [sub, descr] of Object.entries(structure)) {
      await createDir(path.join(ROOT, sub), descr);
    }


    if (VARIANT % 2 !== 0) {
      for (let i = 1; i <= 3; i++) {
        const nested = path.join(ROOT, 'src', 'components', String(i));
        await fs.mkdir(nested, { recursive: true });
        await fs.writeFile(path.join(nested, 'info.txt'), `Компонент ${i}\n`, 'utf8');
      }
    }

    console.log(`Создана структура: project_${VARIANT}\n`);
    console.log(`project_${VARIANT}/`);
    await printTree(ROOT);


    await fs.rename(path.join(ROOT, 'data', 'temp'), path.join(ROOT, 'data', 'temp_moved'));





    await fs.rename(path.join(ROOT, 'data', 'output'), path.join(ROOT, 'data', 'results'));


    await fs.rm(path.join(ROOT, 'data', 'temp_moved'), { recursive: true, force: true });

    console.log('\nПосле изменений:\n');
    console.log(`project_${VARIANT}/`);
    await printTree(ROOT);

  } catch (err) {
    console.error('Ошибка:', err.message);
  }
}

main();