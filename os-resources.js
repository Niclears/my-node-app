#!/usr/bin/env node

const os = require('os');

const GROUP = 'ББМО-01-23';

function toGB(bytes) {
  return (bytes / 1024 / 1024 / 1024).toFixed(2);
}

const cpus = os.cpus();
const cores = cpus.length;
const model = cpus[0]?.model ?? 'неизвестно';
const avgSpeed = Math.round(cpus.reduce((s, c) => s + c.speed, 0) / cores);

console.log('=== Информация о процессоре ===');
console.log(`Количество логических ядер: ${cores}`);
console.log(`Модель процессора: ${model}`);
console.log(`Частота ядер (МГц): ${cpus.map((c) => c.speed).join(', ')}`);
console.log(`Средняя частота: ${avgSpeed} МГц`);

const total = os.totalmem();
const free = os.freemem();
const used = total - free;
const usedPercent = ((used / total) * 100).toFixed(1);

console.log('\n=== Информация о памяти ===');
console.log(`Общий объём: ${toGB(total)} ГБ`);
console.log(`Свободно: ${toGB(free)} ГБ`);
console.log(`Использовано: ${toGB(used)} ГБ (${usedPercent}%)`);


console.log('\n=== Средняя загрузка ===');
if (os.platform() === 'win32') {
  console.log('Для Windows средняя загрузка недоступна (os.loadavg() возвращает [0,0,0])');
} else {
  const [l1, l5, l15] = os.loadavg();
  console.log(`За 1 мин: ${l1.toFixed(2)}`);
  console.log(`За 5 мин: ${l5.toFixed(2)}`);
  console.log(`За 15 мин: ${l15.toFixed(2)}`);
}


console.log(`\nГруппа: ${GROUP}`);
const freePercent = (free / total) * 100;
if (freePercent < 20) {
  console.log(`⚠ Внимание: свободной памяти меньше 20% (${freePercent.toFixed(1)}%)`);
} else {
  console.log('Память в норме');
}