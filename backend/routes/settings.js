const express = require('express');
const router  = express.Router();
const db      = require('../db');

const ALLOWED = ['business_start', 'business_end', 'retry_hours', 'retry_minutes', 'shared_password'];

function getAll() {
  const placeholders = ALLOWED.map(() => '?').join(',');
  const rows = db.prepare(`SELECT key, value FROM settings WHERE key IN (${placeholders})`).all(...ALLOWED);
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

router.get('/', (req, res) => res.json(getAll()));

router.put('/', (req, res) => {
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const entries = Object.entries(req.body).filter(([k]) => ALLOWED.includes(k));
  try {
    db.exec('BEGIN');
    for (const [k, v] of entries) upsert.run(k, String(v));
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: e.message });
  }
  res.json(getAll());
});

module.exports = router;
