import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard service
//
// ONLINE MODE: deploy the Cloudflare Worker in ../../backend (free plan,
// instructions in backend/README.md) and set API_URL to its URL.
//
// OFFLINE MODE (API_URL = null): scores are ranked against a locally-seeded
// board of simulated players so the screens work with zero setup.
//
// Caching (protects the backend from scoreboard query storms):
//   L1 — in-memory per scope, fresh for CACHE_TTL_MS: tab switching is free.
//   L2 — AsyncStorage snapshot: instant paint on app relaunch + offline view.
//   L3 — the Worker's edge cache (30s) collapses identical queries globally.
// ─────────────────────────────────────────────────────────────────────────────
const API_URL = null; // e.g. 'https://dropmerge-leaderboard.YOURNAME.workers.dev'

const CACHE_TTL_MS = 60_000;
const FETCH_TIMEOUT_MS = 6_000;

const KEYS = {
  name:   'dm_player_name',
  geo:    'dm_player_geo',
  best:   'dm_lb_best_score',
  device: 'dm_device_id',
  cache:  'dm_lb_cache_',   // + scope
};

// ── Country → region mapping (must match backend/src/index.js) ──────────────
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

export function regionOf(code) {
  return REGION_OF[code] ?? 'Global';
}

export function flagEmoji(code) {
  if (!code || code.length !== 2 || code === 'XX') return '🌍';
  return code.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

function withTimeout(promise, ms = FETCH_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

// ── Identity ─────────────────────────────────────────────────────────────────

export async function getPlayerName() {
  try { return await AsyncStorage.getItem(KEYS.name); } catch { return null; }
}

export async function setPlayerName(name) {
  try { await AsyncStorage.setItem(KEYS.name, name.trim().slice(0, 14)); } catch {}
}

// Stable anonymous device ID — lets the backend keep one best-score row
// per player without accounts.
export async function getDeviceId() {
  try {
    let id = await AsyncStorage.getItem(KEYS.device);
    if (!id) {
      id = 'dm-' + Date.now().toString(36) + '-' +
        Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 8)).join('');
      await AsyncStorage.setItem(KEYS.device, id);
    }
    return id;
  } catch {
    return 'dm-fallback';
  }
}

// Detect country via geo-IP, cache forever. Locale fallback, then "Earth".
export async function detectGeo() {
  try {
    const cached = await AsyncStorage.getItem(KEYS.geo);
    if (cached) return JSON.parse(cached);
  } catch {}

  let geo = null;
  try {
    const res = await withTimeout(fetch('https://ipapi.co/json/'), 4000);
    const data = await res.json();
    if (data.country_code) {
      geo = { code: data.country_code, name: data.country_name || data.country_code };
    }
  } catch {}

  if (!geo) {
    try {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
      const m = locale.match(/[-_]([A-Z]{2})\b/);
      if (m) geo = { code: m[1], name: m[1] };
    } catch {}
  }

  if (!geo) geo = { code: 'XX', name: 'Earth' };
  geo.region = regionOf(geo.code);

  try { await AsyncStorage.setItem(KEYS.geo, JSON.stringify(geo)); } catch {}
  return geo;
}

// ── Simulated field (offline mode) ──────────────────────────────────────────
const SIM_PLAYERS = [
  ['NovaStrike', 'US', 58420], ['TileLord', 'KR', 51230], ['MergeQueen', 'JP', 47880],
  ['Kazuya_88', 'JP', 44310], ['BlitzFox', 'DE', 41950], ['ChainMaster', 'CN', 39400],
  ['Aurora_X', 'SE', 36720], ['DropKing', 'US', 34150], ['PixelPanda', 'SG', 31980],
  ['Hexa', 'GB', 29840], ['LunaWolf', 'FR', 27660], ['Stackzilla', 'AU', 25910],
  ['MintyFresh', 'CA', 24080], ['Orbit9', 'BR', 22340], ['GoldRusher', 'IN', 20760],
  ['EchoBlade', 'NL', 19220], ['Zenith', 'TW', 17850], ['FrostByte', 'NO', 16410],
  ['SakuraDrop', 'JP', 15080], ['TigerLily', 'TH', 13920], ['Maverick', 'US', 12740],
  ['Quasar', 'ES', 11600], ['NeonNinja', 'KR', 10580], ['Bolt', 'NG', 9620],
  ['CosmicRay', 'IT', 8740], ['Wildcard_W', 'MX', 7890], ['Tempest', 'PL', 7110],
  ['IronTile', 'RU', 6380], ['Glide', 'NZ', 5720], ['Nimbus', 'PH', 5100],
  ['Falcon7', 'AE', 4530], ['Mosaic', 'PT', 4010], ['Ember', 'ZA', 3520],
  ['Drifter', 'AR', 3080], ['Pulse', 'MY', 2670], ['Vortex_V', 'TR', 2290],
  ['Comet', 'IE', 1950], ['Snowdrop', 'FI', 1640], ['Rascal', 'CL', 1360],
  ['Twig', 'EG', 1110], ['Pebble', 'VN', 890], ['Sprout', 'ID', 700],
];

function simEntries() {
  return SIM_PLAYERS.map(([name, country, score]) => ({ name, country, score }));
}

// ── Score submission ────────────────────────────────────────────────────────

export async function submitScore(score) {
  let best = 0;
  try {
    const v = await AsyncStorage.getItem(KEYS.best);
    best = v ? parseInt(v, 10) : 0;
  } catch {}
  if (score > best) {
    best = score;
    try { await AsyncStorage.setItem(KEYS.best, String(best)); } catch {}
  }

  if (API_URL) {
    try {
      const [name, geo, deviceId] = await Promise.all([getPlayerName(), detectGeo(), getDeviceId()]);
      await withTimeout(fetch(`${API_URL}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, name: name || 'Player', country: geo.code, score }),
      }));
      invalidateCache(); // fresh ranks on the next board view
    } catch {}
  }
  return best;
}

// ── Board cache (L1 memory + L2 AsyncStorage) ───────────────────────────────

const memCache = {}; // scope -> { ts, data }

function invalidateCache() {
  for (const k of Object.keys(memCache)) delete memCache[k];
}

async function readPersistedCache(scope) {
  try {
    const raw = await AsyncStorage.getItem(KEYS.cache + scope);
    return raw ? JSON.parse(raw) : null; // { ts, data }
  } catch { return null; }
}

async function writePersistedCache(scope, data) {
  try {
    await AsyncStorage.setItem(KEYS.cache + scope, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

// ── Leaderboard fetch ───────────────────────────────────────────────────────
// scope: 'global' | 'country' | 'region'
// Returns { entries, playerRank, geo } — entries may carry { you: true }.

export async function getLeaderboard(scope) {
  // L1: fresh memory cache
  const cached = memCache[scope];
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  const data = API_URL ? await fetchOnline(scope) : await buildSimBoard(scope);

  memCache[scope] = { ts: Date.now(), data };
  writePersistedCache(scope, data);
  return data;
}

async function fetchOnline(scope) {
  const [geo, deviceId] = await Promise.all([detectGeo(), getDeviceId()]);
  try {
    const [boardRes, rankRes] = await Promise.all([
      withTimeout(fetch(`${API_URL}/leaderboard?scope=${scope}&code=${geo.code}`)),
      withTimeout(fetch(`${API_URL}/rank?device=${encodeURIComponent(deviceId)}&scope=${scope}&code=${geo.code}`)),
    ]);
    const { entries: raw } = await boardRes.json();
    const { rank } = await rankRes.json();

    const entries = raw.map(e => ({
      name: e.name,
      country: e.country,
      score: e.score,
      you: e.device_id === deviceId,
    }));
    return { entries, playerRank: rank, geo };
  } catch {
    // Network down: serve the last persisted snapshot, else the sim board
    const persisted = await readPersistedCache(scope);
    if (persisted) return persisted.data;
    return buildSimBoard(scope);
  }
}

async function buildSimBoard(scope) {
  const [name, geo] = await Promise.all([getPlayerName(), detectGeo()]);
  let best = 0;
  try {
    const v = await AsyncStorage.getItem(KEYS.best);
    best = v ? parseInt(v, 10) : 0;
  } catch {}

  let entries = simEntries();
  if (scope === 'country') {
    entries = entries.filter(e => e.country === geo.code);
  } else if (scope === 'region') {
    entries = entries.filter(e => regionOf(e.country) === geo.region);
  }

  if (best > 0) {
    entries = [...entries, { name: name || 'You', country: geo.code, score: best, you: true }];
  }

  entries.sort((a, b) => b.score - a.score);
  entries = entries.slice(0, 50);

  const playerIdx = entries.findIndex(e => e.you);
  return {
    entries,
    playerRank: playerIdx >= 0 ? playerIdx + 1 : null,
    geo,
  };
}
