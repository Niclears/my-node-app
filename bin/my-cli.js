#!/usr/bin/env node

const { Command } = require('commander');


process.on('uncaughtException', (err) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`✖ Ошибка: ${err.message}`);
    console.error(err.stack);
  } else {
    console.error(`✖ Ошибка: ${err.message || 'Неизвестная ошибка'}`);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  console.error(`✖ Ошибка: ${msg}`);
  process.exit(1);
});

const program = new Command();

program
  .name('my-cli')
  .description('CLI для лабораторной работы №17, группа ББМО-01-23')
  .version('1.0.0');

program
  .command('init')
  .description('инициализация проекта')
  .requiredOption('--name <name>', 'название проекта')
  .requiredOption('--type <type>', 'тип проекта')
  .action(require('../commands/init'));

program
  .command('build')
  .description('сборка проекта')
  .option('--dry-run', 'ничего не изменять')
  .action(require('../commands/build'));

program
  .command('test')
  .description('запуск тестов')
  .action(require('../commands/test'));

program
  .command('deploy')
  .description('развёртывание')
  .option('--env <env>', 'окружение', 'production')
  .option('--force', 'без подтверждения')
  .action(require('../commands/deploy'));

program.parse();