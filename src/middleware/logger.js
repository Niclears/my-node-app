module.exports = async (ctx, next) => {
  const t0 = Date.now();
  await next();
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
           + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  console.log(`[${ts}] ${ctx.method} ${ctx.url} ${ctx.status} (${Date.now() - t0}ms)`);
};