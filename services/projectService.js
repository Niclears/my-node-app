
const fs = require('fs');
const path = require('path');

function initProject({ name, type, cwd = process.cwd() }) {
  if (!name) throw new Error('Не указано имя проекта');
  if (!type) throw new Error('Не указан тип проекта');
  const dir = path.join(cwd, name);
  if (fs.existsSync(dir)) throw new Error(`Директория "${name}" уже существует`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name, version: '1.0.0', type }, null, 2)
  );
  return { dir, name, type };
}

function buildProject({ cwd = process.cwd() }) {
  const configPath = path.join(cwd, 'config.json');
  if (!fs.existsSync(configPath)) {
    const err = new Error('файл конфигурации не найден');
    err.hint = 'Укажите путь через --config';
    throw err;
  }
  const distDir = path.join(cwd, 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  return { output: path.join(distDir, 'build.js') };
}

function testProject() {
  return { passed: 15, total: 15, coverage: 87 };
}

function deployProject({ env }) {
  if (!env) throw new Error('Не указан env');
  return { url: `https://my-app.${env}.example.com` };
}

module.exports = { initProject, buildProject, testProject, deployProject };