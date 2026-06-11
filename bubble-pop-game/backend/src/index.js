// Drop Merge leaderboard API — Cloudflare Worker + D1 (free plan)
//
// Endpoints:
//   GET  /leaderboard?scope=global|country|region&code=SG  -> { entries }
//   GET  /rank?device=ID&scope=...&code=SG                 -> { rank }
//   POST /scores  { deviceId, name, country, score }       -> { ok }
//
// Caching strategy (handles heavy scoreboard read traffic):
//   - Board responses are cached at Cloudflare's edge for EDGE_TTL seconds.
//     Every player asking for the same scope+country within that window is
//     served from cache and never touches the database.
//   - /rank is per-device, so it skips the cache but costs only two indexed
//     queries.
//   - The mobile client additionally caches boards for 60s (see
//     src/utils/leaderboard.js), so tab-switching never refetches.

const EDGE_TTL = 30;             // seconds a board stays in edge cache
const BOARD_LIMIT = 50;          // entries returned per board
const MAX_SCORE = 10_000_000;    // sanity cap for submitted scores
const MIN_SUBMIT_INTERVAL_MS = 10_000; // per-device write throttle

// Must match REGION_OF in the app's src/utils/leaderboard.js
const REGION_OF = {
  US:'North America', CA:'North America', MX:'North America',
  BR:'South America', AR:'South America', CL:'South America', CO:'South America', PE:'South America',
  GB:'Europe', DE:'Europe', FR:'Europe', IT:'Europe', ES:'Europe', NL:'Europe', SE:'Europe',
  PL:'Europe', PT:'Europe', CH:'Europe', AT:'Europe', BE:'Europe', NO:'Europe', DK:'Europe',
  FI:'Europe', IE:'Europe', CZ:'Europe', GR:'Europe', RO:'Europe', HU:'Europe', UA:'Europe',
  CN:'Asia', JP:'Asia', KR:'Asia', IN:'Asia', SG:'Asia', MY:'Asia', TH:'Asia', VN:'Asia',
  PH:'Asia', ID:'Asia', TW:'Asia', HK:'Asia', BD:'Asia', PK:'Asia', LK:'Asia',
  AU:'Oceania', NZ:'Oceania',
  AE:'Middle East', SA:'Middle East', IL:'Middle East', TR:'Middle East', QA:'Middle East', KW:'Middle East',
  ZA:'Africa', NG:'Africa', EG:'Africa', KE:'Africa', MA:'Africa', GH:'Africa',
};
const regionOf = code => REGION_OF[code] ?? 'Global';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...HEADERS, ...extra } });
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: HEADERS });
    const url = new URL(request.url);
    try {
      if (url.pathname === '/leaderboard' && request.method === 'GET') return await leaderboard(url, env, ctx);
      if (url.pathname === '/rank'        && request.method === 'GET') return await rank(url, env);
      if (url.pathname === '/scores'      && request.method === 'POST') return await submit(request, env);
      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: 'server error' }, 500);
    }
  },
};

async function leaderboard(url, env, ctx) {
  const scope = url.searchParams.get('scope') ?? 'global';
  const code = (url.searchParams.get('code') ?? '').toUpperCase().slice(0, 2);

  // Edge cache: one DB hit per scope+country per EDGE_TTL window,
  // no matter how many players are watching the board.
  const cache = caches.default;
  const cacheKey = new Request(`https://board.cache/leaderboard?scope=${scope}&code=${code}`);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  let stmt;
  if (scope === 'country') {
    stmt = env.DB.prepare(
      'SELECT device_id, name, country, score FROM scores WHERE country = ?1 ORDER BY score DESC LIMIT ?2'
    ).bind(code, BOARD_LIMIT);
  } else if (scope === 'region') {
    stmt = env.DB.prepare(
      'SELECT device_id, name, country, score FROM scores WHERE region = ?1 ORDER BY score DESC LIMIT ?2'
    ).bind(regionOf(code), BOARD_LIMIT);
  } else {
    stmt = env.DB.prepare(
      'SELECT device_id, name, country, score FROM scores ORDER BY score DESC LIMIT ?1'
    ).bind(BOARD_LIMIT);
  }

  const { results } = await stmt.all();
  const res = json({ entries: results }, 200, {
    'Cache-Control': `public, s-maxage=${EDGE_TTL}, max-age=15`,
  });
  ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

async function rank(url, env) {
  const device = (url.searchParams.get('device') ?? '').slice(0, 64);
  const scope = url.searchParams.get('scope') ?? 'global';
  if (!device) return json({ rank: null });

  const me = await env.DB.prepare(
    'SELECT score, country, region FROM scores WHERE device_id = ?1'
  ).bind(device).first();
  if (!me) return json({ rank: null });

  let row;
  if (scope === 'country') {
    row = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM scores WHERE country = ?1 AND score > ?2'
    ).bind(me.country, me.score).first();
  } else if (scope === 'region') {
    row = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM scores WHERE region = ?1 AND score > ?2'
    ).bind(me.region, me.score).first();
  } else {
    row = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM scores WHERE score > ?1'
    ).bind(me.score).first();
  }
  return json({ rank: (row?.n ?? 0) + 1 }, 200, { 'Cache-Control': 'no-store' });
}

async function submit(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400); }

  const device = String(body.deviceId ?? '').slice(0, 64);
  const name = String(body.name ?? 'Player').replace(/[^\w .\-]/g, '').trim().slice(0, 14) || 'Player';
  const country = /^[A-Za-z]{2}$/.test(body.country ?? '') ? body.country.toUpperCase() : 'XX';
  const score = Math.floor(Number(body.score));

  if (device.length < 8) return json({ error: 'bad device' }, 400);
  if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) return json({ error: 'bad score' }, 400);

  // Per-device write throttle: ignores rapid-fire submissions
  const now = Date.now();
  const existing = await env.DB.prepare(
    'SELECT updated_at FROM scores WHERE device_id = ?1'
  ).bind(device).first();
  if (existing && now - existing.updated_at < MIN_SUBMIT_INTERVAL_MS) {
    return json({ ok: true, throttled: true });
  }

  // Upsert keeps each device's best score
  await env.DB.prepare(`
    INSERT INTO scores (device_id, name, country, region, score, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6)
    ON CONFLICT(device_id) DO UPDATE SET
      name = excluded.name,
      country = excluded.country,
      region = excluded.region,
      score = MAX(scores.score, excluded.score),
      updated_at = excluded.updated_at
  `).bind(device, name, country, regionOf(country), score, now).run();

  return json({ ok: true });
}
