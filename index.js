const http = require('http');
const EventEmitter = require('events');


class AppServer extends EventEmitter {
  constructor() {
    super();
    this.server = null;
    this.port = null;
  }

  start(port) {
    this.port = port;
    this.server = http.createServer((req, res) => {
      this.emit('request:received', { url: req.url, method: req.method });

      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Hello from Event-Driven Server!');
    });

    this.server.listen(port, () => {
      this.emit('server:started', port);
    });
  }

  stop() {
    if (this.server) {
      this.server.close(() => this.emit('server:stopped'));
    }
  }
}

const app = new AppServer();


app.on('server:started', (port) => {
  console.log(`Сервер запущен на порту ${port}`);
});

app.on('request:received', ({ method, url }) => {
  console.log(`Получен запрос: ${method} ${url}`);
});

app.on('server:stopped', () => {
  console.log('Сервер остановлен');
});

const logger = require('./logger');
logger.setupLogger(app);


app.start(3000);


setTimeout(() => {
  app.stop();
}, 10000);