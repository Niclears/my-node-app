#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const cliProgress = require('cli-progress');
const fs = require('fs');


const isTTY = process.stdout.isTTY;
const color = isTTY ? chalk : new chalk.Instance({ level: 0 });

const program = new Command();
program.name('my-cli').version('1.0.0');

program
  .command('process')
  .description('обработать файлы')
  .requiredOption('--files <files...>', 'список файлов')
  .option('--no-interactive', 'отключить спиннер и прогресс-бар')
  .action(async (options) => {
    const files = options.files;
    const existing = [];
    const missing = [];

    for (const f of files) {
      if (fs.existsSync(f)) existing.push(f);
      else missing.push(f);
    }

   
    if (isTTY && options.interactive !== false) {
      const bar = new cliProgress.SingleBar({
        format: 'Обработка файлов... |{bar}| {percentage}% | {value}/{total}',
        barCompleteChar: '█',
        barIncompleteChar: '░'
      });
      bar.start(files.length, 0);
      for (let i = 0; i < files.length; i++) {
        bar.update(i + 1);
        await new Promise((r) => setTimeout(r, 100));
      }
      bar.stop();
    }

  
    existing.forEach((f) => process.stderr.write(`${color.green('✔')} Файл ${f} обработан\n`));
    missing.forEach((f) => process.stderr.write(`${color.red('✖')} Файл ${f} не найден\n`));

    if (missing.length > 0) {
      process.stderr.write(`${color.yellow('△')} Пропущено ${missing.length} файл(ов)\n`);
    }

    if (existing.length > 0) {
      console.log(JSON.stringify({ processed: existing, missing }, null, 2));
    }

  
    if (existing.length === 0 && missing.length === 0) {
      process.exit(0);
    }

    process.exit(missing.length > 0 ? 1 : 0);
  });

program.parse();