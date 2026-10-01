const service = require('../services/projectService');
const log = require('../utils/logger');

module.exports = async function testAction() {
  const r = service.testProject();
  log.success(`Пройдено: ${r.passed}/${r.total} тестов`);
  log.success(`Покрытие: ${r.coverage}%`);
};