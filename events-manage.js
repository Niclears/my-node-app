#!/usr/bin/env node

const EventEmitter = require('events');

const GROUP = 'ББМО-01-23';
const emitter = new EventEmitter();

function listener1() {}
function listener2() {}
function listener3() {}

emitter.on('tick', listener1);
emitter.on('tick', listener2);
emitter.on('tick', listener3);

console.log('Управление подписками\n');
console.log(`Слушателей до удаления: ${emitter.listenerCount('tick')}`);
console.log(`Массив слушателей: ${emitter.listeners('tick').length} функций`);

emitter.removeListener('tick', listener2);
console.log(`Слушателей после удаления одного: ${emitter.listenerCount('tick')}`);

emitter.removeAllListeners('tick');
console.log(`Слушателей после removeAllListeners: ${emitter.listenerCount('tick')}`);


console.log('\nПорядок вызова:');
const orderEmitter = new EventEmitter();
orderEmitter.on('order', () => console.log(`1. Первый слушатель (группа ${GROUP})`));
orderEmitter.on('order', () => console.log('2. Второй слушатель'));
orderEmitter.on('order', () => console.log('3. Третий слушатель'));
orderEmitter.emit('order');