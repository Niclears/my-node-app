#!/usr/bin/env node

const os = require('os');
const fs = require('fs');
const path = require('path');

const GROUP = 'ББМО-01-23';
const LOG_FILE = path.join(__dirname, 'monitor.log');
const INTERVAL = 2000;


function toGB(bytes) {
  return (bytes / 1024 / 1024 / 1024).toFixed(2);
}

function now() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
       + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function logWarning(message) {
  const line = `[${now()}] [${GROUP}] Предупреждение: ${message}\n`;
  fs.appendFileSync(LOG_FILE, line, 'utf8');
}


function snapshot() {
  const cpus = os.cpus();
  const total = os.totalmem();
  const free = os.freemem();
  return {
    timestamp: now(),
    group: GROUP,
    platform: os.platform(),
    arch: os.arch(),
    uptime: os.uptime(),
    cpuCount: cpus.length,
    cpuModel: cpus[0]?.model,
    cpuTimes: cpus.map((c) => ({ ...c.times })),
    totalMem: total,
    freeMem: free,
    loadAvg: os.loadavg()
  };
}


function cpuUsage(prev, curr) {
  let busyDiff = 0;
  let totalDiff = 0;
  for (let i = 0; i < prev.cpuTimes.length; i++) {
    const p = prev.cpuTimes[i];
    const c = curr.cpuTimes[i];
    const pTotal = p.user + p.nice + p.sys + p.idle + p.irq;
    const cTotal = c.user + c.nice + c.sys + c.idle + c.irq;
    const pIdle = p.idle;
    const cIdle = c.idle;
    totalDiff += cTotal - pTotal;
    busyDiff += (cTotal - pTotal) - (cIdle - pIdle);
  }
  if (totalDiff === 0) return 0;
  return (busyDiff / totalDiff) * 100;
}


console.log(`Мониторинг (группа ${GROUP}). Ctrl+C для выхода.\n`);
const first = snapshot();
console.log('=== Первичный снимок системы ===');
console.log(`Время: ${first.timestamp}`);
console.log(`Платформа: ${first.platform} (${first.arch})`);
console.log(`CPU: ${first.cpuModel} (${first.cpuCount} ядер)`);
console.log(`RAM: ${toGB(first.totalMem)} ГБ всего, ${toGB(first.freeMem)} ГБ свободно`);
console.log('');


let prev = first;
let warnings = 0;
let iterations = 0;
const MAX_ITERATIONS = 5; 

const timer = setInterval(() => {
  const curr = snapshot();
  const cpu = cpuUsage(prev, curr);
  const freePercent = (curr.freeMem / curr.totalMem) * 100;
  const usedPercent = 100 - freePercent;


  let status = 'норма';
  if (cpu > 80) {
    status = 'КРИТИЧНО';
    logWarning(`CPU ${cpu.toFixed(1)}% (критично)`);
    warnings++;
  } else if (cpu > 50) {
    status = 'предупреждение';
    logWarning(`CPU ${cpu.toFixed(1)}% (предупреждение)`);
    warnings++;
  }
  if (freePercent < 10) {
    logWarning(`Свободной памяти меньше 10% (${freePercent.toFixed(1)}%)`);
    warnings++;
  }

  process.stdout.write(
    `CPU: ${cpu.toFixed(1)}% | RAM: ${usedPercent.toFixed(1)}% (${toGB(curr.freeMem)} ГБ свободно) [${status}]\n`
  );

  prev = curr;
  iterations++;

  if (iterations >= MAX_ITERATIONS) {
    clearInterval(timer);
    console.log(`\nМониторинг остановлен. Предупреждений: ${warnings}`);
    process.exit(0);
  }
}, INTERVAL);


process.on('SIGINT', () => {
  clearInterval(timer);
  console.log(`\nМониторинг остановлен. Предупреждений: ${warnings}`);
  process.exit(0);
});