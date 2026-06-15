// Node 24 ships node:sqlite as a stable built-in — no native addon needed.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs   = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'callback.db'));

db.exec("PRAGMA journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS queue (
    id                        INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_name                TEXT    NOT NULL,
    customer_number           TEXT    NOT NULL,
    formatted_number          TEXT,
    country                   TEXT,
    timezone                  TEXT,
    local_time_iso            TEXT,
    verdict                   TEXT    NOT NULL,
    callback_due_iso          TEXT,
    callback_due_customer_iso TEXT,
    next_window_iso           TEXT,
    status                    TEXT    DEFAULT 'Pending'
                              CHECK(status IN ('Pending','Called','Cancelled')),
    created_at                TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Seed defaults (INSERT OR IGNORE preserves existing values across restarts)
const seed = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
[
  ['business_start',  '08:00'],
  ['business_end',    '19:00'],
  ['retry_hours',     '3'],
  ['retry_minutes',   '15'],
  ['shared_password', ''],
].forEach(([k, v]) => seed.run(k, v));

module.exports = db;
