const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const { initDb } = require('./db');

const app  = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.use('/api/check',    require('./routes/check'));
app.use('/api/queue',    require('./routes/queue'));
app.use('/api/settings', require('./routes/settings'));

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', time: new Date().toISOString() }),
);

// Serve built frontend in production (when frontend/dist has been copied here)
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
}

// Initialise DB tables then start listening
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\nCallback Window Checker backend → http://localhost:${PORT}`);
      console.log('DB: connected and tables ready\n');
    });
  })
  .catch(err => {
    console.error('Failed to initialise database:', err.message);
    process.exit(1);
  });
