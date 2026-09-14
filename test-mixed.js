const FileManagerMixed = require('./fileOperationsMixed');

async function main() {
  const fm = new FileManagerMixed('./data-mixed');
  console.log('=== СМЕШАННЫЙ ПОДХОД ===\n');

  try {
    console.log('1. Создание файла...');
    const p = await fm.createFile('mixed.txt', 'Смешанный подход работает!');
    console.log(`  Создан: ${p}`);

    console.log('\n2. Чтение файла...');
    const content = await fm.readFile('mixed.txt');
    console.log(`  Содержимое: "${content}"`);

    console.log('\n3. Список файлов...');
    const files = await fm.listFiles();
    console.log(`  Файлы: ${files.join(', ')}`);

    console.log('\n4. Очистка...');
    await fm.deleteFile('mixed.txt');
    console.log('  Файл удалён');

    console.log('\nГотово. Внутри — колбэки, снаружи — промисы.');
  } catch (err) {
    console.error('Ошибка:', err.message);
  }
}

main();