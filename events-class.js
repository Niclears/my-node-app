#!/usr/bin/env node

const EventEmitter = require('events');

const GROUP = 'ББМО-01-23';

class DatabaseConnection extends EventEmitter {
  constructor(name = 'default') {
    super();
    this.name = name;
    this.connected = false;
  }

  connect() {
    this.emit('connect', `Подключение к БД ${this.name}...`);
    this.connected = true;
    this.emit('connected', 'Соединение установлено');
  }

  query(sql, rows = 0) {
    if (!this.connected) {
      this.emit('error', new Error('Нет соединения с БД'));
      return;
    }
    this.emit('query', sql);
    this.emit('result', rows);
  }

  close() {
    this.emit('close', 'Закрытие соединения');
    this.connected = false;
    this.emit('closed', 'Соединение закрыто');
  }
}

const db = new DatabaseConnection('students');


db.on('connect', (msg) => console.log(`[EVENT] ${msg}`));
db.on('connected', (msg) => console.log(`[EVENT] ${msg}`));
db.on('query', (sql) => console.log(`[EVENT] Выполнение запроса: ${sql}`));
db.on('result', (rows) => console.log(`[EVENT] Результат: ${rows} записей`));
db.on('close', (msg) => console.log(`[EVENT] ${msg}`));
db.on('closed', (msg) => console.log(`[EVENT] ${msg}`));


db.on('error', (err) => console.log(`[EVENT] Ошибка: ${err.message}`));

console.log(`DatabaseConnection (группа ${GROUP})\n`);
db.connect();
db.query('SELECT * FROM students', 50);
db.query('INSERT INTO students', 1);
db.close();


console.log('\n[EVENT] Демонстрация ошибки');
const db2 = new DatabaseConnection('broken');
db2.on('error', (err) => console.log(`[EVENT] Ошибка: ${err.message}`));
db2.query('SELECT 1'); // вызовет error, потому что нет соединения