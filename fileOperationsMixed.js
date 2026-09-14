const fs = require('fs');
const path = require('path');

class FileManagerMixed {
  constructor(baseDir = './data-mixed') {
    this.baseDir = baseDir;
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
      console.log(`Создана директория: ${baseDir}`);
    }
  }


  _createFileCallback(filename, content, callback) {
    const filePath = path.join(this.baseDir, filename);
    fs.writeFile(filePath, content, 'utf8', (err) => {
      if (err) return callback(err, null);
      callback(null, filePath);
    });
  }

  _readFileCallback(filename, callback) {
    const filePath = path.join(this.baseDir, filename);
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) return callback(err, null);
      callback(null, data);
    });
  }

  _listFilesCallback(callback) {
    fs.readdir(this.baseDir, (err, files) => {
      if (err) return callback(err, null);
      callback(null, files);
    });
  }

  _deleteFileCallback(filename, callback) {
    const filePath = path.join(this.baseDir, filename);
    fs.unlink(filePath, (err) => {
      if (err) return callback(err);
      callback(null);
    });
  }


  createFile(filename, content) {
    return new Promise((resolve, reject) => {
      this._createFileCallback(filename, content, (err, filePath) => {
        if (err) return reject(err);
        resolve(filePath);
      });
    });
  }

  readFile(filename) {
    return new Promise((resolve, reject) => {
      this._readFileCallback(filename, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });
  }

  listFiles() {
    return new Promise((resolve, reject) => {
      this._listFilesCallback((err, files) => {
        if (err) return reject(err);
        resolve(files);
      });
    });
  }

  deleteFile(filename) {
    return new Promise((resolve, reject) => {
      this._deleteFileCallback(filename, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}

module.exports = FileManagerMixed;