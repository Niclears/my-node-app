module.exports = (role) => async (ctx, next) => {
  if (!ctx.user || ctx.user.role !== role) {
    ctx.status = 403;
    ctx.body = { error: `Forbidden: ${role} role required`, status: 403 };
    return;
  }
  await next();
};