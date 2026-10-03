const service = require('../services/authService');

exports.register = async (ctx) => {
  const result = await service.register(ctx.request.body);
  const tokens = await service.login({ email: result.email, password: ctx.request.body.password });
  ctx.status = 201;
  ctx.body = { data: result, ...tokens };
};

exports.login = async (ctx) => {
  const { email, password } = ctx.request.body;
  const tokens = await service.login({ email, password });
  ctx.body = tokens;
};

exports.refresh = async (ctx) => {
  const { refreshToken } = ctx.request.body;
  ctx.body = await service.refresh(refreshToken);
};

exports.logout = async (ctx) => {
  ctx.body = { data: { loggedOut: true } };
};