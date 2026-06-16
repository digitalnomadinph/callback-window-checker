const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all — Pending first, then by callback_due, then created_at
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM queue
    ORDER BY
      CASE status WHEN 'Pending' THEN 0 ELSE 1 END,
      callback_due_iso ASC,
      created_at ASC
  `).all();
  res.json(rows);
});

// POST — save a checked number to the queue
router.post('/', (req, res) => {
  const {
    agent_name, customer_number, formatted_number,
    country, timezone, local_time_iso,
    verdict, callback_due_iso, callback_due_customer_iso, next_window_iso,
  } = req.body;

  if (!agent_name || !customer_number || !verdict) {
    return res.status(400).json({ error: 'agent_name, customer_number, and verdict are required.' });
  }

  const result = db.prepare(`
    INSERT INTO queue (
      agent_name, customer_number, formatted_number,
      country, timezone, local_time_iso,
      verdict, callback_due_iso, callback_due_customer_iso, next_window_iso
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    agent_name, customer_number, formatted_number ?? null,
    country ?? null, timezone ?? null, local_time_iso ?? null,
    verdict, callback_due_iso ?? null, callback_due_customer_iso ?? null, next_window_iso ?? null,
  );

  res.status(201).json(db.prepare('SELECT * FROM queue WHERE id = ?').get(result.lastInsertRowid));
});

// PUT /:id — update status only
router.put('/:id', (req, res) => {
  const { status } = req.body;
  if (!['Pending', 'Called', 'Cancelled'].includes(status)) {
    return res.status(400).json({ error: 'status must be Pending, Called, or Cancelled.' });
  }
  db.prepare('UPDATE queue SET status = ? WHERE id = ?').run(status, req.params.id);
  const row = db.prepare('SELECT * FROM queue WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Queue item not found.' });
  res.json(row);
});

// DELETE /:id — hard delete (admin use)
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM queue WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
