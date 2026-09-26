const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const service = require('../../services/projectService');

test('initProject создаёт директорию', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'my-cli-'));
  const result = service.initProject({ name: 'demo', type: 'cli', cwd: tmp });
  assert.ok(fs.existsSync(result.dir));
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('initProject бросает ошибку без name', () => {
  assert.throws(() => service.initProject({ type: 'cli' }), /имя проекта/);
});

test('testProject возвращает результат', () => {
  const r = service.testProject();
  assert.strictEqual(r.passed, 15);
  assert.strictEqual(r.total, 15);
});