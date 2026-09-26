require('dotenv').config();
const { MongoClient } = require('mongodb');

let client;
let db;

async function connect() {
  if (db) return db;
  client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  db = client.db(process.env.MONGO_DB || 'bbmo_01_23');
  console.log('[INFO] MongoDB подключена');
  return db;
}

function getDb() {
  if (!db) throw new Error('DB not connected');
  return db;
}

async function close() {
  if (client) await client.close();
}

module.exports = { connect, getDb, close };