const Joi = require('joi');
const service = require('../services/userService');

const schema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  group_name: Joi.string().pattern(/^ББМО-\d{2}-\d{2}$/).required(),
  age: Joi.number().integer().min(16).max(100).optional(),
  course: Joi.number().integer().min(1).max(4).optional()
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  group_name: Joi.string().pattern(/^ББМО-\d{2}-\d{2}$/).optional(),
  course: Joi.number().integer().min(1).max(4).optional(),
  age_min: Joi.number().integer().min(16).optional(),
  age_max: Joi.number().integer().max(100).optional(),
  sort: Joi.string().pattern(/^-?(name|email|age|course)$/).optional(),
  search: Joi.string().max(100).optional()
});

function validate(data) {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    const details = error.details.map((d) => ({ field: d.path.join('.'), message: d.message }));
    const err = new Error('Validation failed');
    err.status = 400;
    err.details = details;
    throw err;
  }
  return value;
}

function validateQuery(query) {
  const { error, value } = querySchema.validate(query, { abortEarly: false, convert: true });
  if (error) {
    const details = error.details.map((d) => ({ field: d.path.join('.'), message: d.message }));
    const err = new Error('Validation failed');
    err.status = 400;
    err.details = details;
    throw err;
  }
  return value;
}

exports.list = async (ctx) => {
  const q = validateQuery(ctx.query);
  const result = await service.listPaged(q);
  ctx.body = {
    data: result.items,
    pagination: { total: result.total, page: result.page, limit: result.limit, pages: result.pages }
  };
};

exports.get = async (ctx) => {
  const u = await service.getById(ctx.params.id);
  if (!u) { ctx.status = 404; ctx.body = { error: 'Not found' }; return; }
  ctx.body = { data: u };
};

exports.create = async (ctx) => {
  const data = validate(ctx.request.body);
  const u = await service.create(data);
  ctx.status = 201;
  ctx.body = { data: u };
};

exports.update = async (ctx) => {
  const data = validate(ctx.request.body);
  const u = await service.update(ctx.params.id, data);
  if (!u) { ctx.status = 404; ctx.body = { error: 'Not found' }; return; }
  ctx.body = { data: u };
};

exports.delete = async (ctx) => {
  const ok = await service.delete(ctx.params.id);
  if (!ok) { ctx.status = 404; ctx.body = { error: 'Not found' }; return; }
  ctx.body = { data: { deleted: true } };
};

exports.search = async (ctx) => {
  const q = ctx.query.q;
  if (!q) { ctx.status = 400; ctx.body = { error: 'Укажите q' }; return; }
  const result = await service.listPaged({ search: q, page: 1, limit: 20 });
  ctx.body = { found: result.total, data: result.items };
};

exports.stats = async (ctx) => {
  ctx.body = await service.stats();
};

exports.exportCsv = async (ctx) => {
  const users = await service.listAll();
  const header = 'id,name,email,group_name,age,course';
  const rows = users.map((u) =>
    [u._id, u.name, u.email, u.group_name, u.age || '', u.course || ''].join(','));
  ctx.set('Content-Type', 'text/csv; charset=utf-8');
  ctx.body = [header, ...rows].join('\n');
};
