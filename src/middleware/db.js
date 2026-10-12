const { getDb } = require('../db/mongo');

module.exports = async (ctx, next) => {
  ctx.db = getDb();
  await next();
};