const express    = require('express');
const router     = express.Router();
const { pool }   = require('../db');

const ALLOWED = ['business_start', 'business_end', 'retry_hours', 'retry_minutes', 'shared_password'];

async function getAll() {
  const ph = ALLOWED.map((_, i) => `$${i + 1}`).join(',');
  const { rows } = await pool.query(
    `SELECT key, value FROM settings WHERE key IN (${ph})`,
    ALLOWED,
  );
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

router.get('/', async (req, res) => {
  try {
    res.json(await getAll());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/', async (req, res) => {
  const entries = Object.entries(req.body).filter(([k]) => ALLOWED.includes(k));
  try {
    for (const [k, v] of entries) {
      await pool.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
        [k, String(v)],
      );
    }
    res.json(await getAll());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
