#!/usr/bin/env node

const EventEmitter = require('events');

const GROUP = 'ББМО-01-23';
const PREFIX = `[${GROUP}]`;

class PluginManager extends EventEmitter {
  constructor() {
    super();

    this.on('newListener', (event, listener) => {
      console.log(`[newListener] Добавлен слушатель "${event}"`);
    });


    this.on('removeListener', (event, listener) => {
      console.log(`[removeListener] Удалён слушатель "${event}"`);
    });
  }

  register(name) {
    this.emit('plugin:registered', name);
  }

  unregister(name) {
    this.emit('plugin:removed', name);
  }
}

console.log('Система плагинов\n');
const pm = new PluginManager();


const onRegistered = (name) => {
  console.log(`[PLUGIN] Зарегистрирован: ${name}`);

  pm.on(name.toLowerCase(), () => console.log(`[${name}] действие`));
};
const onRemoved = (name) => {
  console.log(`[PLUGIN] Удалён: ${name}`);
};

pm.on('plugin:registered', onRegistered);
pm.on('plugin:removed', onRemoved);

pm.register('LoggerPlugin');
pm.register('AlertPlugin');

pm.removeListener('plugin:registered', onRegistered);
pm.unregister('LoggerPlugin');

console.log('\nДемонстрация утечки');
const leak = new EventEmitter();
const noop = () => {};
console.log(`Слушателей до: ${leak.listenerCount('leak')}`);
for (let i = 0; i < 10; i++) leak.on('leak', noop);
console.log(`Слушателей после добавления 10: ${leak.listenerCount('leak')}`);
for (let i = 0; i < 1000; i++) leak.on('leak', noop);
console.log(`Слушателей после добавления 1000: ${leak.listenerCount('leak')}`);
leak.removeAllListeners('leak');
console.log(`Слушателей после removeAllListeners: ${leak.listenerCount('leak')}`);


console.log('\nАсинхронные слушатели');
const asyncEmitter = new EventEmitter();
asyncEmitter.on('async-event', async () => {
  await new Promise((r) => setTimeout(r, 100));
  console.log(`${PREFIX} async-слушатель завершён через 100ms`);
});
console.log(`${PREFIX} emit вызван (не ждёт async-слушатель)`);
asyncEmitter.emit('async-event');

setImmediate(() => console.log(`${PREFIX} setImmediate завершён`));