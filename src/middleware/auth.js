const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'dev-secret';

module.exports = async (ctx, next) => {
  const header = ctx.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    ctx.status = 401;
    ctx.body = { error: 'Unauthorized', status: 401 };
    return;
  }
  try {
    ctx.user = jwt.verify(token, SECRET);
    await next();
  } catch (e) {
    ctx.status = 401;
    ctx.body = { error: 'Invalid or expired token', status: 401 };
  }
};
