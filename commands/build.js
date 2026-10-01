const service = require('../services/projectService');
const log = require('../utils/logger');

module.exports = async function buildAction(options) {
  const start = Date.now();
  try {
    const result = service.buildProject({});
    log.success(`Сборка завершена за ${((Date.now() - start) / 1000).toFixed(1)}s`);
    process.stderr.write(`Результат: ${result.output}\n`);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      log.error(`Ошибка: ${err.message}`);
      console.error(err.stack);
    } else {
      log.error(`Ошибка: ${err.message}`);
      if (err.hint) console.error(err.hint);
    }
    process.exit(1);
  }
};