# Drop Merge Leaderboard Backend

Cloudflare Workers + D1 (SQLite). **Free plan**: 100,000 requests/day,
5 GB database, edge caching included — no credit card required.

With the 30s edge cache, board reads barely touch the database: even
100k players watching the leaderboard costs ~3 DB queries per minute
per board.

## Deploy (one time, ~5 minutes)

```bash
# 1. Install wrangler and log in (creates a free account if needed)
npm install -g wrangler
wrangler login

# 2. Create the database
cd backend
wrangler d1 create dropmerge
#    -> copy the database_id it prints into wrangler.toml

# 3. Create the table
wrangler d1 execute dropmerge --file=schema.sql --remote

# 4. Ship it
wrangler deploy
#    -> prints your URL, e.g. https://dropmerge-leaderboard.YOURNAME.workers.dev
```

## Connect the app

In `../src/utils/leaderboard.js` set:

```js
const API_URL = 'https://dropmerge-leaderboard.YOURNAME.workers.dev';
```

That's it — scores submit globally and all three boards go live.

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/leaderboard?scope=global\|country\|region&code=SG` | Top 50, edge-cached 30s |
| GET | `/rank?device=ID&scope=...&code=SG` | Player's exact rank, uncached |
| POST | `/scores` `{ deviceId, name, country, score }` | Upserts the device's best |

## Abuse protection

- Score sanity cap (10M), name sanitization, 2-letter country validation
- Per-device write throttle (1 submission / 10s)
- One row per device — resubmitting only ever raises your own best

For a production game add a signed payload (HMAC of score + device with a
key shipped in the binary) before trusting scores with real prizes.

## Local development

```bash
wrangler d1 execute dropmerge --file=schema.sql --local
wrangler dev   # serves http://localhost:8787 against a local D1
```
