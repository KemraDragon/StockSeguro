const path = require('path');
const { app } = require('electron');
const Database = require('better-sqlite3');

let db;

function getDbPath() {
  // DB queda en una ruta segura que existe en el .exe también
  return path.join(app.getPath('userData'), 'stockseguro.db');
}

function connectDb() {
  if (db) return db;

  const dbPath = getDbPath();
  db = new Database(dbPath);

  // MUY importante: activar foreign keys en SQLite
  db.pragma('foreign_keys = ON');

  return db;
}

module.exports = { connectDb, getDbPath };

