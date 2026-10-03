const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

const SECRET = process.env.JWT_SECRET || 'dev-secret';
const ACCESS_TTL = Number(process.env.JWT_ACCESS_TTL) || 900;
const REFRESH_TTL = Number(process.env.JWT_REFRESH_TTL) || 604800;

function users() { return global.__db.collection('users'); }

exports.register = async ({ name, email, password, group_name, age, role = 'user' }) => {
  if (!name || !email || !password || !group_name) {
    const err = new Error('Validation failed'); err.status = 400; throw err;
  }
  const exists = await users().findOne({ email });
  if (exists) { const err = new Error('Email already exists'); err.status = 409; throw err; }
  const passwordHash = await bcrypt.hash(password, 10);
  const doc = { name, email, passwordHash, group_name, age, role, created_at: new Date() };
  const r = await users().insertOne(doc);
  return { userId: String(r.insertedId), email, role };
};

function signTokens(user) {
  const payload = { userId: String(user._id), email: user.email, role: user.role };
  const accessToken = jwt.sign(payload, SECRET, { expiresIn: ACCESS_TTL });
  const refreshToken = jwt.sign({ userId: payload.userId, type: 'refresh' }, SECRET, { expiresIn: REFRESH_TTL });
  return { accessToken, refreshToken, expiresIn: ACCESS_TTL };
}

exports.login = async ({ email, password }) => {
  const user = await users().findOne({ email });
  if (!user) { const err = new Error('Invalid credentials'); err.status = 401; throw err; }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) { const err = new Error('Invalid credentials'); err.status = 401; throw err; }
  return signTokens(user);
};

exports.refresh = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, SECRET);
    if (decoded.type !== 'refresh') throw new Error('Bad token type');
    const user = await users().findOne({ _id: new ObjectId(decoded.userId) });
    if (!user) { const err = new Error('User not found'); err.status = 401; throw err; }
    return signTokens(user);
  } catch (e) {
    const err = new Error('Invalid refresh token'); err.status = 401; throw err;
  }
};
