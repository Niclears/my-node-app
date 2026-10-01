#!/usr/bin/env node
// ЛР17, Задание 3: интерактивный режим через inquirer
const { Command } = require('commander');
const inquirer = require('inquirer');

const program = new Command();
program.name('my-cli').version('1.0.0');

program
  .command('init')
  .description('инициализировать проект')
  .option('--name <name>', 'название проекта')
  .option('--type <type>', 'тип проекта (web|cli|lib|microservice)')
  .option('--typescript', 'использовать TypeScript')
  .option('--eslint', 'использовать ESLint')
  .option('--prettier', 'использовать Prettier')
  .option('--jest', 'использовать Jest')
  .option('--git', 'инициализировать Git')
  .option('--no-interactive', 'отключить интерактивный режим')
  .action(async (options) => {
    if (options.interactive === false) {
      if (!options.name || !options.type) {
        console.error('Ошибка: в неинтерактивном режиме необходимо указать --name и --type');
        process.exit(1);
      }
      const opts = [];
      if (options.typescript) opts.push('TypeScript');
      if (options.eslint) opts.push('ESLint');
      if (options.prettier) opts.push('Prettier');
      if (options.jest) opts.push('Jest');
      console.log(`Проект "${options.name}" успешно инициализирован!`);
      console.log(`Тип: ${options.type}`);
      console.log(`Опции: ${opts.join(', ') || 'нет'}`);
      console.log(`Git: ${options.git ? 'да' : 'нет'}`);
      return;
    }

    const answers = await inquirer.prompt([
      { type: 'input', name: 'name', message: 'Введите название проекта:', default: 'my-project' },
      {
        type: 'list', name: 'type', message: 'Выберите тип проекта:',
        choices: ['Web-приложение', 'CLI-утилита', 'Библиотека', 'Микросервис']
      },
      {
        type: 'checkbox', name: 'options', message: 'Выберите дополнительные опции:',
        choices: ['TypeScript', 'ESLint', 'Prettier', 'Jest']
      },
      { type: 'confirm', name: 'git', message: 'Использовать Git?', default: true },
      { type: 'password', name: 'token', message: 'Введите токен доступа:', mask: '*' }
    ]);

    console.log(`\nПроект "${answers.name}" успешно инициализирован!`);
    console.log(`Тип: ${answers.type}`);
    console.log(`Опции: ${answers.options.join(', ') || 'нет'}`);
    console.log(`Git: ${answers.git ? 'да' : 'нет'}`);
  });

program.parse();