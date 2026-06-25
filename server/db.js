const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'timetracker.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run migrations
db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user       TEXT    NOT NULL,
    category   TEXT    NOT NULL,
    customer   TEXT    NOT NULL,
    notes      TEXT    DEFAULT '',
    minutes    INTEGER NOT NULL,
    date       TEXT    NOT NULL,
    source     TEXT    NOT NULL DEFAULT 'manual',
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_entries_user     ON entries(user);
  CREATE INDEX IF NOT EXISTS idx_entries_date     ON entries(date);
  CREATE INDEX IF NOT EXISTS idx_entries_category ON entries(category);
  CREATE INDEX IF NOT EXISTS idx_entries_source   ON entries(source);
`);

// Add source column to existing databases (idempotent migration)
const cols = db.prepare("PRAGMA table_info(entries)").all();
if (!cols.find(c => c.name === 'source')) {
  db.exec("ALTER TABLE entries ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'");
}

// OAuth token storage
db.exec(`
  CREATE TABLE IF NOT EXISTS tokens (
    user          TEXT PRIMARY KEY,
    access_token  TEXT NOT NULL,
    refresh_token TEXT,
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
