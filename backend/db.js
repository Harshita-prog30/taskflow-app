const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'taskflow.db');

let db = null;

function saveDB(sqlDb) {
  const data = sqlDb.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function wrapDB(sqlDb) {
  return {
    _sqlDb: sqlDb,
    prepare(sql) {
      return {
        run(...params) {
          sqlDb.run(sql, params);
          const row = sqlDb.exec('SELECT last_insert_rowid()');
          const lastInsertRowid = row[0]?.values[0][0] || null;
          saveDB(sqlDb);
          return { lastInsertRowid };
        },
        get(...params) {
          const result = sqlDb.exec(sql, params);
          if (!result[0]) return undefined;
          const cols = result[0].columns;
          const vals = result[0].values[0];
          if (!vals) return undefined;
          return Object.fromEntries(cols.map((c, i) => [c, vals[i]]));
        },
        all(...params) {
          const result = sqlDb.exec(sql, params);
          if (!result[0]) return [];
          const cols = result[0].columns;
          return result[0].values.map(row => Object.fromEntries(cols.map((c, i) => [c, row[i]])));
        }
      };
    },
    exec(sql) {
      sqlDb.run(sql);
      saveDB(sqlDb);
    },
    pragma() {}
  };
}

async function initDB() {
  const SQL = await initSqlJs();
  let sqlDb;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }
  db = wrapDB(sqlDb);

  db.exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    owner_id INTEGER NOT NULL,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS project_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    project_id INTEGER NOT NULL,
    assignee_id INTEGER,
    creator_id INTEGER NOT NULL,
    status TEXT DEFAULT 'todo',
    priority TEXT DEFAULT 'medium',
    due_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@taskflow.com');
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Admin User', 'admin@taskflow.com', hash, 'admin');
    console.log('Seeded admin: admin@taskflow.com / admin123');
  }
  console.log('Database initialized');
}

function getDB() {
  if (!db) throw new Error('DB not initialized');
  return db;
}

module.exports = { getDB, initDB };