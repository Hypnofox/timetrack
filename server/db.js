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
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_entries_user     ON entries(user);
  CREATE INDEX IF NOT EXISTS idx_entries_date     ON entries(date);
  CREATE INDEX IF NOT EXISTS idx_entries_category ON entries(category);
`);

module.exports = db;
