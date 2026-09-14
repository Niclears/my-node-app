const fs = require('fs');
const path = require('path');

class FileManager {
  constructor(baseDir = './data') {
    this.baseDir = baseDir;
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
      console.log(`Создана директория: ${baseDir}`);
    }
  }

  createFile(filename, content, callback) {
    const filePath = path.join(this.baseDir, filename);
    fs.writeFile(filePath, content, 'utf8', (err) => {
      if (err) return callback(err, null);
      callback(null, filePath);
    });
  }

  readFile(filename, callback) {
    const filePath = path.join(this.baseDir, filename);
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) return callback(err, null);
      callback(null, data);
    });
  }

  getFileStats(filename, callback) {
    const filePath = path.join(this.baseDir, filename);
    fs.stat(filePath, (err, stats) => {
      if (err) return callback(err, null);
      callback(null, {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile()
      });
    });
  }

  deleteFile(filename, callback) {
    const filePath = path.join(this.baseDir, filename);
    fs.unlink(filePath, (err) => {
      if (err) return callback(err);
      callback(null);
    });
  }

  listFiles(callback) {
    fs.readdir(this.baseDir, (err, files) => {
      if (err) return callback(err, null);
      callback(null, files);
    });
  }
}

module.exports = FileManager;