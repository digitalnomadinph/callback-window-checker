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

## Deploying online (single-service, recommended)

### Build the frontend into the backend

```bash
cd frontend
npm run build     # outputs to ../backend/public/
```

Express automatically serves `backend/public` as static files and falls through to `index.html` for client-side routing.

### Render.com

1. Push the repo to GitHub.
2. New → **Web Service** → connect repo.
3. **Root directory**: leave blank (repo root).
4. **Build command**:
   ```
   cd frontend && npm install && npm run build && cd ../backend && npm install
   ```
5. **Start command**:
   ```
   node backend/server.js
   ```
6. **Environment variables**: none required (SQLite is local to the instance).

> **Persistence note**: Render's free tier has an ephemeral filesystem — the SQLite file is wiped on each deploy. Use Render's paid persistent disk ($7/mo), or swap `better-sqlite3` for a PostgreSQL connection string (see Future Work below).

### Railway

1. Connect repo → New Project → Deploy from repo.
2. Add a service, set **Start command**: `node backend/server.js`.
3. Add a second build step or use a `railway.toml`:
   ```toml
   [build]
   builder = "NIXPACKS"
   buildCommand = "cd frontend && npm install && npm run build && cd ../backend && npm install"

   [deploy]
   startCommand = "node backend/server.js"
   ```
4. Railway provides a volume you can mount at `/app/backend/data` for SQLite persistence.

### Fly.io

```bash
cd callback-window-checker
fly launch          # follow prompts, set app name
fly volumes create callback_data --size 1   # 1 GB volume for SQLite
```

Add to `fly.toml`:
```toml
[mounts]
  source = "callback_data"
  destination = "/app/backend/data"
```

Then deploy:
```bash
fly deploy
```

### Separate frontend (Netlify / Vercel) + backend (Render)

If you prefer a CDN-hosted frontend:

1. Deploy backend to Render as above.
2. Copy the Render URL (e.g. `https://callback-checker.onrender.com`).
3. In `frontend/`, create a `.env` file:
   ```
   VITE_API_URL=https://callback-checker.onrender.com
   ```
4. `npm run build` → drag `frontend/dist/` to Netlify Drop, or connect the repo on Vercel.

---

## Future work / known limitations

- **Real per-user auth**: replace localStorage name + shared password with an auth library (e.g. Passport.js + sessions, or a JWT-based approach). Store agent records in the DB.
- **Push notifications**: notify agents when a callback becomes due (Web Push or a Slack webhook).
- **PostgreSQL support**: swap `better-sqlite3` for `pg` when you need a managed database with no filesystem dependency.
- **Audit log**: record who changed a queue item's status and when.
- **Number history**: per-agent or per-number lookup history.
- **Dark mode**: Tailwind's `dark:` variant is ready to wire up.
