import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard service
//
// OFFLINE MODE (default): scores are ranked against a locally-seeded board of
// simulated players so the screens are fully functional with zero setup.
//
// ONLINE MODE: set API_URL to your backend and implement two endpoints:
//   GET  {API_URL}/leaderboard?scope=global|country|region&code=SG
//        -> { entries: [{ name, country, score }] }
//   POST {API_URL}/scores   body: { name, country, score }
// Firebase/Supabase both work; the shapes below are all you need.
// ─────────────────────────────────────────────────────────────────────────────
const API_URL = null; // e.g. 'https://your-backend.example.com/api'

const KEYS = {
  name:  'dm_player_name',
  geo:   'dm_player_geo',
  best:  'dm_lb_best_score',
};

// ── Country → region mapping ────────────────────────────────────────────────
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

// ── Player identity ─────────────────────────────────────────────────────────

export async function getPlayerName() {
  try { return await AsyncStorage.getItem(KEYS.name); } catch { return null; }
}

export async function setPlayerName(name) {
  try { await AsyncStorage.setItem(KEYS.name, name.trim().slice(0, 14)); } catch {}
}

// Detect country via geo-IP, cache forever. Falls back to device locale,
// then to "Earth" — the game never blocks on this.
export async function detectGeo() {
  try {
    const cached = await AsyncStorage.getItem(KEYS.geo);
    if (cached) return JSON.parse(cached);
  } catch {}

  let geo = null;
  try {
    const res = await Promise.race([
      fetch('https://ipapi.co/json/'),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
    ]);
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

// ── Simulated global field (offline mode) ───────────────────────────────────
// A believable spread of competitors so ranks feel real from game one.
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
      const [name, geo] = await Promise.all([getPlayerName(), detectGeo()]);
      await fetch(`${API_URL}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || 'Player', country: geo.code, score }),
      });
    } catch {}
  }
  return best;
}

// ── Leaderboard fetch ───────────────────────────────────────────────────────
// scope: 'global' | 'country' | 'region'
// Returns { entries, playerRank } where entries include the player ("you": true).

export async function getLeaderboard(scope) {
  const [name, geo] = await Promise.all([getPlayerName(), detectGeo()]);
  let best = 0;
  try {
    const v = await AsyncStorage.getItem(KEYS.best);
    best = v ? parseInt(v, 10) : 0;
  } catch {}

  let entries;
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/leaderboard?scope=${scope}&code=${geo.code}`);
      entries = (await res.json()).entries;
    } catch {
      entries = simEntries();
    }
  } else {
    entries = simEntries();
  }

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
