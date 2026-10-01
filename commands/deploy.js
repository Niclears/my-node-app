const readline = require('readline');
const service = require('../services/projectService');
const log = require('../utils/logger');

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const a = answer.trim().toLowerCase();
      resolve(a === 'y' || a === 'yes' || a === 'д');
    });
  });
}

module.exports = async function deployAction(options) {
  if (!options.force) {
    log.warn(`Вы собираетесь развернуть проект в ${options.env}!`);
    const ok = await confirm('Продолжить? (y/N) ');
    if (!ok) {
      log.info('Отменено');
      process.exit(0);
    }
  }
  log.info('Развёртывание...');
  const result = service.deployProject({ env: options.env });
  log.success('Развёрнуто успешно');
  process.stderr.write(`URL: ${result.url}\n`);
};