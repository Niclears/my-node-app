const User = require('../models/user');

exports.list = async () => User.findAll();
exports.listAll = async () => User.findAll();
exports.listPaged = async (options) => User.findAllPaged(options);
exports.getById = async (id) => User.findById(id);

exports.create = async (data) => {
  console.log(`[SERVICE] Создание пользователя: ${data.email}`);
  const exists = await User.findByEmail(data.email);
  if (exists) {
    const err = new Error('Email already exists');
    err.status = 409;
    throw err;
  }
  console.log('[MODEL] insertOne');
  const user = await User.create({ ...data, created_at: new Date() });
  console.log(`[SERVICE] Email отправлен: ${data.email}`);
  return user;
};

exports.update = async (id, data) => {
  console.log(`[SERVICE] Обновление: ${id}`);
  return User.update(id, data);
};

exports.delete = async (id) => {
  console.log(`[SERVICE] Удаление: ${id}`);
  return User.delete(id);
};

exports.stats = async () => User.stats();
