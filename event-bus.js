#!/usr/bin/env node
const EventEmitter = require('events');
const http = require('http');
const os = require('os');

const GROUP = 'ББМО-01-23';

class EventBus extends EventEmitter {
  constructor() {
    super();
    this._listeners = new Map(); 
    this._onAny = [];
    this._metrics = {
      events: {},     // event -> count
      errors: {},     // event -> count
      lastCall: {},   // event -> timestamp
      total: 0
    };
  }

  on(event, listener, priority = 0) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push({ listener, priority, once: false });
    this._listeners.get(event).sort((a, b) => b.priority - a.priority);
    return this;
  }

  once(event, listener, priority = 0) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push({ listener, priority, once: true });
    this._listeners.get(event).sort((a, b) => b.priority - a.priority);
    return this;
  }

  onAny(listener) {
    this._onAny.push(listener);
    return this;
  }

  off(event, listener) {
    const arr = this._listeners.get(event);
    if (!arr) return this;
    const idx = arr.findIndex((x) => x.listener === listener);
    if (idx !== -1) arr.splice(idx, 1);
    return this;
  }

  emit(event, ...args) {
 
    this._metrics.events[event] = (this._metrics.events[event] || 0) + 1;
    this._metrics.lastCall[event] = new Date().toISOString();
    this._metrics.total++;

    
    this._onAny.forEach((l) => {
      try { l(event, args); } catch (err) { /* не роняем */ }
    });

 
    const arr = this._listeners.get(event) || [];
    const remaining = [];
    for (const entry of arr) {
      try {
        entry.listener(...args);
      } catch (err) {
        this._metrics.errors[event] = (this._metrics.errors[event] || 0) + 1;
        console.error(`[ERROR] [${GROUP}] Ошибка в слушателе "${event}": ${err.message}`);
      }
      if (!entry.once) remaining.push(entry);
    }
    this._listeners.set(event, remaining);

  
    if (event === 'error' && arr.length === 0) {
      throw new Error(args[0]?.message || 'Unhandled error event');
    }

    return true;
  }

  getMetrics() {
    const listeners = {};
    for (const [ev, arr] of this._listeners.entries()) {
      listeners[ev] = arr.length;
    }
    return {
      group: GROUP,
      events: this._metrics.events,
      errors: this._metrics.errors,
      lastCall: this._metrics.lastCall,
      total: this._metrics.total,
      listeners
    };
  }
}


console.log(`=== EventBus (группа ${GROUP}) ===\n`);

const bus = new EventBus();


console.log('--- Приоритеты ---');
bus.on('priority', () => console.log('[priority 0] Низкий приоритет'), 0);
bus.on('priority', () => console.log('[priority 10] Высокий приоритет'), 10);
bus.on('priority', () => console.log('[priority 5] Средний приоритет'), 5);
bus.emit('priority');


console.log('\n--- Wildcard ---');
bus.onAny((event, args) => {
  console.log(`[onAny] Событие "${event}" с аргументами: ${JSON.stringify(args)}`);
});
bus.emit('greet', 'Иван');
bus.emit('info', GROUP);


console.log('\n--- Once-кэш ---');
let tickCount = 0;
bus.on('tick', () => { tickCount++; console.log(`[tick] Вызов ${tickCount}`); });
bus.once('tick', () => { console.log('[tick] once-слушатель'); });
bus.emit('tick');
bus.emit('tick');
bus.emit('tick');


console.log('\n--- Обработка ошибок ---');
bus.on('test', () => { throw new Error('Сломалось в test'); });
bus.on('test2', () => { throw new Error('Сломалось в test2'); });
bus.emit('test');
bus.emit('test2');


console.log('\n--- Метрики ---');
const m = bus.getMetrics();
for (const [ev, count] of Object.entries(m.events)) {
  const errs = m.errors[ev] ? ` (${m.errors[ev]} ошибка)` : '';
  console.log(`${ev}: ${count} вызов${errs}`);
}
console.log(`Всего событий: ${m.total}`);


const server = http.createServer((req, res) => {
  bus.emit('request', req.url);
  if (req.url === '/metrics') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(bus.getMetrics(), null, 2));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('OK. Метрики: /metrics');
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`\nHTTP: http://localhost:${PORT}/metrics`);
  console.log('Ctrl+C для остановки');
});