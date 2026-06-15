const { Pool } = require('pg');

// In production (Render), DATABASE_URL comes from an env var.
// In local dev, you can also set DATABASE_URL or let it fall through
// to node:sqlite by running the sqlite branch below.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase / Render Postgres require SSL in production
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS queue (
      id                        SERIAL PRIMARY KEY,
      agent_name                TEXT        NOT NULL,
      customer_number           TEXT        NOT NULL,
      formatted_number          TEXT,
      country                   TEXT,
      timezone                  TEXT,
      local_time_iso            TEXT,
      verdict                   TEXT        NOT NULL,
      callback_due_iso          TEXT,
      callback_due_customer_iso TEXT,
      next_window_iso           TEXT,
      status                    TEXT        NOT NULL DEFAULT 'Pending'
                                CHECK (status IN ('Pending','Called','Cancelled')),
      created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Seed defaults (ON CONFLICT DO NOTHING preserves existing values)
  const seeds = [
    ['business_start',  '08:00'],
    ['business_end',    '19:00'],
    ['retry_hours',     '3'],
    ['retry_minutes',   '15'],
    ['shared_password', ''],
  ];
  for (const [k, v] of seeds) {
    await pool.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [k, v],
    );
  }
}

module.exports = { pool, initDb };
