#!/usr/bin/env node

const { Command } = require('commander');

const program = new Command();

program
  .name('my-cli')
  .description('CLI-приложение для лабораторной работы №17')
  .version('1.0.0', '-V, --version', 'output the version number')
  .option('-v, --verbose', 'подробный вывод')
  .helpOption('-h, --help', 'display help for command');

program
  .command('generate')
  .description('сгенерировать отчёт')
  .option('-t, --type <type>', 'тип отчёта (по умолчанию: "html")', 'html')
  .option('-o, --output <path>', 'путь для сохранения', 'output.html')
  .option('-f, --force', 'перезаписать существующий файл')
  .option('--dry-run', 'показать что будет сделано без выполнения')
  .action((options) => {
    const validTypes = ['html', 'pdf', 'json', 'csv'];
    if (!validTypes.includes(options.type)) {
      console.error(`Ошибка: недопустимый тип отчёта "${options.type}".`);
      console.error(`Допустимые значения: ${validTypes.join(', ')}`);
      process.exit(1);
    }

    if (options.dryRun) {
      console.log(`[DRY-RUN] Будет сгенерирован отчёт типа: ${options.type}`);
      console.log(`[DRY-RUN] Файл будет сохранён в: ${options.output}`);
      console.log('[DRY-RUN] Действия не выполнены (режим проверки)');
      return;
    }

    if (options.verbose) {
      console.log('[VERBOSE] Запуск генерации отчёта...');
      console.log(`[VERBOSE] Тип отчёта: ${options.type}`);
      console.log(`[VERBOSE] Путь сохранения: ${options.output}`);
    }

    console.log(`Отчёт успешно сгенерирован: ${options.output}`);
  });

program
  .command('convert')
  .description('конвертировать файл')
  .option('-f, --from <format>', 'исходный формат', 'json')
  .option('-t, --to <format>', 'целевой формат', 'csv')
  .option('-o, --output <path>', 'путь для сохранения')
  .action((options) => {
    if (options.verbose) console.log('[VERBOSE] Конвертация...');
    console.log(`Конвертация ${options.from} → ${options.to}`);
    if (options.output) console.log(`Результат: ${options.output}`);
  });

program.parse();