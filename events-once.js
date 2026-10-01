#!/usr/bin/env node

const EventEmitter = require('events');

const GROUP = 'ББМО-01-23';
const emitter = new EventEmitter();

let onCount = 0;
let onceCount = 0;


emitter.on('tick', () => {
  onCount++;
  console.log(`[tick #${onCount}] on-слушатель`);
});


emitter.once('tick', () => {
  onceCount++;
  console.log(`[tick #${onceCount}] once-слушатель`);
});

console.log('Сравнение on и once\n');

emitter.emit('tick'); // #1 — оба
emitter.emit('tick'); // #2 — только on
emitter.emit('tick'); // #3 — только on

console.log(`\non-слушатель вызван: ${onCount} раза`);
console.log(`once-слушатель вызван: ${onceCount} раз`);