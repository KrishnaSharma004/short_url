# Snip — AI-Enhanced URL Shortener (Node + Express + MongoDB + React)

A full-stack URL shortener with auth, custom aliases, click analytics, admin view, Redis-style caching, tests and Docker, plus an **ML malicious-URL detector** and optional **LLM features** (Claude).

## Quick start (demo mode, one port)

Requires Node 22+ and a running MongoDB (`mongodb://127.0.0.1:27017`).

```bash
npm run setup                  # install server + client deps
cp server/.env.example server/.env   # then set JWT_SECRET (and ADMIN_EMAIL)
npm run build                  # build the React app
npm run seed                   # optional: demo user + fake click history
npm start                      # -> http://localhost:8001  (API + React + redirects)
```

Demo login after seeding: `demo@example.com` / `demo12345`.
To get an **admin**, sign up with the email you put in `ADMIN_EMAIL`.

Development with hot reload (API on :8001, Vite on :5173): `npm run dev`

Everything with Docker (API + Mongo + Redis): copy `.env.example` to `.env`, then `docker compose up --build`.

## Features

- Auth: signup/login/logout, **bcrypt** hashed passwords, JWT in an **httpOnly cookie** (never in localStorage)
- Short codes: random **base62**, 7 chars (~3.5T combos, not guessable), unique index + retry on collision
- **Custom aliases** with uniqueness check and a reserved-word list (`login`, `api`, ...)
- Validation with **zod**; only `http`/`https` URLs (rejects `javascript:`), no links back to this service
- `helmet`, **rate limiting** on login/signup and link creation, central error handler, request logging
- Redirect uses **302** (+ `no-store`) so every click reaches the server; unknown -> 404, expired -> 410, disabled -> 404
- Clicks stored in a separate **Click** collection (timestamp, referrer, browser, OS, device via `ua-parser-js`), written asynchronously so redirects never wait on the DB
- Analytics: clicks per day (7/14/30), top referrers, devices, browsers, OS, recent clicks (Recharts)
- Link expiry, enable/disable, delete (deletes its clicks too), admin page with all links and totals
- **Redis cache** for `shortCode -> URL` (set `REDIS_URL`; falls back to an in-memory cache with no setup). Cache is invalidated on disable/delete.
- **ML threat detection** (below), **LLM assistant features** (below)
- Jest + Supertest tests, GitHub Actions CI, Dockerfile + docker-compose

## AI / ML features

**1. Malicious-URL detection (machine learning, always on).** Every submitted URL is scored by a gradient-boosting
classifier trained on ~420k labelled URLs (35 lexical features computed from the URL text; nothing is fetched).
- score ≥ `THREAT_BLOCK_THRESHOLD` (0.90) → creation refused with a 422 and plain-language reasons
- score ≥ `THREAT_FLAG_THRESHOLD` (0.50) → link is created, flagged **Suspicious**, and visitors see a warning page
  ("Continue anyway" adds `?proceed=1`; no click is counted on the warning page)
- the Create form shows the verdict as soon as you leave the URL field
- held-out test results (grouped by website, so no leakage): ROC-AUC 0.946; at the block threshold precision 96.9%
  and false-positive rate 0.16%; see `ml/metrics.json`, `ml/roc.png`, `ml/confusion.png`. It is a heuristic filter, not a
  guarantee: it can miss new attacks and occasionally flags an unfamiliar legitimate site (use `TRUSTED_DOMAINS`).
- the model is exported as JSON and evaluated in Node (`server/src/ml/`), so it needs no Python at runtime;
  retrain with `ml/train.py` (see `ml/README.md`).

**2. LLM features (optional, set `ANTHROPIC_API_KEY`).** Without a key everything still works with simple fallbacks.
- **Alias suggestions** (`POST /api/urls/suggest-alias`): LLM suggestions, filtered to valid, unused, non-reserved aliases
- **Auto-categorisation**: instant keyword category on creation, refined by the LLM in the background
- **Ask AI about a link** (`POST /api/urls/:id/ask`): natural-language questions answered from that link's aggregated analytics
- privacy: only the URL text and aggregated counts are sent to the model; referrer/browser strings are sanitised and
  passed as quoted data, the model has no tools, and the endpoints are rate limited.

## API

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/signup` `/api/auth/login` | – | rate limited |
| POST | `/api/auth/logout` · GET `/api/auth/me` | – | |
| POST | `/api/urls` | user | `{ url, alias?, expiresAt? }` (422 if the ML model blocks it) |
| POST | `/api/urls/check` | user | `{ url }` → ML risk verdict, nothing created |
| POST | `/api/urls/suggest-alias` | user | `{ url }` → `{ source, suggestions[] }` |
| POST | `/api/urls/:id/ask` | owner/admin | `{ question }` → `{ answer }` (needs `ANTHROPIC_API_KEY`) |
| GET | `/api/urls` | user | my links |
| PATCH | `/api/urls/:id` | owner/admin | `{ isActive?, expiresAt? }` |
| DELETE | `/api/urls/:id` | owner/admin | |
| GET | `/api/urls/:id/analytics?days=14` | owner/admin | |
| GET | `/api/admin/urls` · `/api/admin/stats` | admin | |
| GET | `/:code` | – | 302 redirect |

## Structure

```
server/src  config/ models/ middleware/ services/ controllers/ routes/ utils/  app.js server.js
server/src/ml  (model.json, features.js, gbm.js)   ml/  (training pipeline, metrics)
server/tests  server/scripts/seed.js
client/src  pages/ components/ api.js auth.jsx
```

## Tests

`cd server && npm test` (downloads an in-memory MongoDB on first run), or point `TEST_MONGO_URI` at any Mongo.

## Talking points for the demo

- Why 302 not 301 (browser caching would hide repeat clicks from analytics)
- Why base62 random + unique index instead of hashing/truncating the URL (collisions)
- Why a Click collection instead of an array (unbounded document growth)
- Why httpOnly cookie instead of localStorage (XSS can't steal the token)
- Why Redis in front of redirects (read-heavy path), and async click writes

## Not done yet (next steps from the roadmap)

QR codes, country-from-IP, Swagger docs, deployment (Render/Railway + Atlas + Vercel), live link/screenshots in this README.
