const service = require('../services/projectService');
const log = require('../utils/logger');

module.exports = async function initAction(options) {
  try {
    const result = service.initProject({ name: options.name, type: options.type });
    log.success(`Проект "${result.name}" создан`);
    log.success('Установлены зависимости');
    log.success('Инициализирован Git-репозиторий');
    process.stderr.write('Проект готов к работе!\n');
  } catch (err) {
    log.error(err.message);
    process.exit(1);
  }
};