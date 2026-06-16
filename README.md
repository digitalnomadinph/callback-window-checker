# Callback Window Checker

A real-time web app for 24/7 technical support teams. Type any customer phone number → get instant DST-aware verdict on whether it's a good time to call, plus a shared callback queue so day and night shifts never double-call.

---

## Local setup (development)

### Prerequisites
- Node.js **22+** (`node --version`) — the backend uses `node:sqlite`, a built-in module that became stable in Node 22.15+. Node 24 (recommended) works out of the box with no native addon compilation.
- Two terminal windows

### 1. Install dependencies

```bash
# Terminal A
cd callback-window-checker/backend
npm install

# Terminal B
cd callback-window-checker/frontend
npm install
```

### 2. Start the backend

```bash
# Terminal A (stays running)
cd backend
npm run dev        # uses node --watch for auto-restart
```

The backend listens on **http://localhost:3001**.  
A SQLite database is created at `backend/data/callback.db` on first run.

### 3. Start the frontend

```bash
# Terminal B (stays running)
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.  
The Vite dev server proxies `/api/*` calls to the backend automatically.

---

## Test numbers

| Number | Country | Timezone |
|--------|---------|----------|
| `+1 415 555 2671` | US | America/Los_Angeles |
| `+1 212 555 1234` | US | America/New_York |
| `+44 20 7946 0958` | UK | Europe/London |
| `+63 2 8123 4567` | Philippines | Asia/Manila |
| `+61 2 9374 4000` | Australia | Australia/Sydney |
| `+61 8 9321 1234` | Australia | Australia/Perth |
| `+81 3 1234 5678` | Japan | Asia/Tokyo |
| `+91 22 6180 0000` | India | Asia/Kolkata |
| `+55 11 9999 8888` | Brazil | America/Sao_Paulo |

Multi-timezone countries (US, AU, BR) will show a dropdown for the agent to confirm which zone applies.

---

## Architecture

```
callback-window-checker/
├── backend/              Express + SQLite
│   ├── server.js         Entry point; serves API + built frontend in prod
│   ├── db.js             better-sqlite3 setup + schema migrations
│   └── routes/
│       ├── check.js      POST /api/check  ← core phone→timezone→verdict logic
│       ├── queue.js      GET/POST/PUT/DELETE /api/queue
│       └── settings.js   GET/PUT /api/settings
└── frontend/             React + Vite + Tailwind
    └── src/
        ├── App.jsx        Tab shell + auth gate
        ├── api.js         Typed fetch wrapper
        └── components/
            ├── AgentAuth.jsx      Name/password screen; persists to localStorage
            ├── PhoneChecker.jsx   Input + triggers /api/check
            ├── ResultCard.jsx     Green/amber verdict card with timezone picker
            ├── CallbackQueue.jsx  Shared queue table; auto-refreshes every 30 s
            └── Settings.jsx       Business hours, retry interval, team password
```

### How timezone detection works

1. `libphonenumber-js` parses the raw number → validates it + extracts country code.
2. `libphonenumber-geo-carrier` maps the parsed number to one or more IANA timezone IDs using area-code data. For multi-zone countries this narrows down to the most likely zone.
3. If `libphonenumber-geo-carrier` can't resolve a zone, a country → timezone fallback map covers 50+ countries.
4. `luxon` computes `DateTime.now().setZone(zone)` — always DST-correct because it uses the IANA database, never a hardcoded UTC offset.

---

## Deploying online (free: Netlify + Render)

This repo ships with `netlify.toml` and `render.yaml` pre-configured for a free split deployment: Netlify hosts the React frontend, Render hosts the Express + SQLite backend.

### 1. Backend → Render

1. Push the repo to GitHub.
2. [render.com](https://render.com) → sign up with GitHub → **New → Web Service** → pick this repo.
3. Render reads `render.yaml` automatically (region: Singapore, plan: free). Click **Deploy**.
4. Copy the resulting URL, e.g. `https://callback-window-checker-api.onrender.com`.

### 2. Frontend → Netlify

1. [netlify.com](https://netlify.com) → **Add new site → Import an existing project** → pick this repo.
2. Netlify reads `netlify.toml` automatically (base: `frontend`, publish: `dist`).
3. **Site configuration → Environment variables** → add `VITE_API_URL` = the Render URL from step 1.
4. Trigger a deploy. Share the resulting `*.netlify.app` URL with your team.

> **Persistence note**: Render's free tier has an ephemeral filesystem — the SQLite file resets if the service redeploys or sleeps for an extended period. For a small team checking a shared queue, this is a minor inconvenience, not a blocker. If it becomes a problem, swap `backend/db.js` to use a free hosted Postgres (e.g. Supabase or Neon) via the `pg` package — this only touches `db.js` and the three route files, all of which use plain SQL.

### Alternative: single-service deploy (no Netlify)

Render can serve both the API and the built frontend from one service, skipping Netlify entirely:

```bash
cd frontend && npm run build   # outputs to ../backend/public/ (when NETLIFY env var isn't set)
```

Then on Render, use build command `cd frontend && npm install && npm run build && cd ../backend && npm install` and start command `node backend/server.js`. Express serves `backend/public` automatically when present.

---

## Future work / known limitations

- **Real per-user auth**: replace localStorage name + shared password with an auth library (e.g. Passport.js + sessions, or a JWT-based approach). Store agent records in the DB.
- **Push notifications**: notify agents when a callback becomes due (Web Push or a Slack webhook).
- **PostgreSQL support**: swap `better-sqlite3` for `pg` when you need a managed database with no filesystem dependency.
- **Audit log**: record who changed a queue item's status and when.
- **Number history**: per-agent or per-number lookup history.
- **Dark mode**: Tailwind's `dark:` variant is ready to wire up.
