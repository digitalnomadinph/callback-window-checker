const express  = require('express');
const router   = express.Router();
const { pool } = require('../db');

// GET all — Pending first, then by callback_due, then created_at
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM queue
      ORDER BY
        CASE status WHEN 'Pending' THEN 0 ELSE 1 END,
        callback_due_iso ASC NULLS LAST,
        created_at ASC
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST — save a checked number to the queue
router.post('/', async (req, res) => {
  const {
    agent_name, customer_number, formatted_number,
    country, timezone, local_time_iso,
    verdict, callback_due_iso, callback_due_customer_iso, next_window_iso,
  } = req.body;

  if (!agent_name || !customer_number || !verdict) {
    return res.status(400).json({ error: 'agent_name, customer_number, and verdict are required.' });
  }

  try {
    const { rows } = await pool.query(`
      INSERT INTO queue (
        agent_name, customer_number, formatted_number,
        country, timezone, local_time_iso,
        verdict, callback_due_iso, callback_due_customer_iso, next_window_iso
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `, [
      agent_name, customer_number, formatted_number ?? null,
      country ?? null, timezone ?? null, local_time_iso ?? null,
      verdict, callback_due_iso ?? null, callback_due_customer_iso ?? null, next_window_iso ?? null,
    ]);
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /:id — update status only
router.put('/:id', async (req, res) => {
  const { status } = req.body;
  if (!['Pending', 'Called', 'Cancelled'].includes(status)) {
    return res.status(400).json({ error: 'status must be Pending, Called, or Cancelled.' });
  }
  try {
    const { rows } = await pool.query(
      'UPDATE queue SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Queue item not found.' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM queue WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
