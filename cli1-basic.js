#!/usr/bin/env node

const GROUP = 'ББМО-01-23';
const STUDENT = 'Козлов Михаил Денисович';

function now() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function showHelp() {
  console.log('Использование: my-cli <команда> [аргументы]');
  console.log('');
  console.log('Доступные команды:');
  console.log('  greet <имя>   — поприветствовать пользователя');
  console.log('  info          — вывести информацию о группе');
  console.log('  --help        — показать справку');
  process.exit(0);
}

function main() {
  const args = process.argv.slice(2);
  const [command, ...rest] = args;

  if (!command || command === '--help' || command === '-h') {
    showHelp();
  }

  if (command === 'greet') {
    const name = rest[0];
    if (!name) {
      console.error('Ошибка: укажите имя. Пример: my-cli greet "Иван"');
      process.exit(1);
    }
    console.log(`Привет, ${name}! Добро пожаловать в CLI-приложение группы ${GROUP}.`);
    process.exit(0);
  }

  if (command === 'info') {
    console.log(`Группа: ${GROUP}`);
    console.log(`Студент: ${STUDENT}`);
    console.log('Лабораторная работа: №17');
    console.log(`Дата: ${now()}`);
    process.exit(0);
  }

  console.error(`Ошибка: неизвестная команда "${command}"`);
  console.error('Для справки используйте: my-cli --help');
  process.exit(1);
}

main();