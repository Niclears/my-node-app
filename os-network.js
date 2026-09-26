#!/usr/bin/env node

const os = require('os');

const GROUP = 'ББМО-01-23';

function maskMac(mac) {
  if (!mac || mac === '00:00:00:00:00:00') return mac;
  const parts = mac.split(':');
  return `${parts[0]}:${parts[1]}:**:**:**:**`;
}

function findPrimaryIPv4(interfaces) {
  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) {
        return { name, address: a.address };
      }
    }
  }
  return null;
}

console.log('=== Сетевые интерфейсы ===\n');
const ifaces = os.networkInterfaces();

for (const [name, addrs] of Object.entries(ifaces)) {
  console.log(`Интерфейс: ${name}`);
  for (const a of addrs || []) {
    console.log(`  Семейство: ${a.family}`);
    console.log(`  Адрес: ${a.address}`);
    if (a.mac && a.mac !== '00:00:00:00:00:00') {
      console.log(`  MAC (маскированный): ${maskMac(a.mac)}`);
    }
    console.log(`  Internal: ${a.internal ? 'да' : 'нет'}`);
  }
  console.log('');
}

const primary = findPrimaryIPv4(ifaces);
console.log('=== Основной интерфейс ===');
if (primary) {
  console.log(`${primary.name} (${primary.address})`);
} else {
  console.log('Не найден внешний IPv4-интерфейс');
}


console.log('\n=== Информация о пользователе ===');
const user = os.userInfo();
console.log(`Имя пользователя: ${user.username}`);
console.log(`UID: ${user.uid}`);
console.log(`GID: ${user.gid}`);
console.log(`Домашняя директория: ${user.homedir}`);
console.log(`Оболочка: ${user.shell || 'недоступно (Windows)'}`);


console.log(`\nГруппа: ${GROUP}`);
console.log(`Проверка root: ${user.uid === 0 ? 'ДА (вы root!)' : 'нет'}`);