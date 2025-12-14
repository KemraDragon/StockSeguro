const fs = require('fs');
const path = require('path');
const { connectDb } = require('./db');

function initDb() {
  const db = connectDb();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
  console.log('✅ SQLite listo:', db.name);
  return db;
}

module.exports = { initDb };
