import AsyncStorage from '@react-native-async-storage/async-storage';
import { TILES } from './gameLogic';

// ─────────────────────────────────────────────────────────────────────────────
// Cosmetics & card drawing — 100% visual. Nothing here changes difficulty,
// scoring, timers, or odds: every player competes on identical rules.
//
// Token economy (revenue + retention):
//   +1 token  first game of the day        (+2 at a 3-day streak, +3 at 7)
//   +2 tokens comeback gift after 2+ days away
//   +1 token  per rewarded ad watched in the Card Vault   <- ad revenue
//   1 token = 1 card draw. Draws never duplicate: every draw unlocks
//   something new until the collection is complete.
// ─────────────────────────────────────────────────────────────────────────────

const KEYS = {
  tokens:   'dm_cards_tokens',
  owned:    'dm_cards_owned',
  equipped: 'dm_cards_equipped',
};

export const RARITY = {
  common:    { label: 'Common',    color: '#9e9e9e', weight: 60 },
  rare:      { label: 'Rare',      color: '#00d4ff', weight: 25 },
  epic:      { label: 'Epic',      color: '#cc00ff', weight: 12 },
  legendary: { label: 'Legendary', color: '#ffd700', weight: 3  },
};

// ── Theme palettes ──────────────────────────────────────────────────────────
const VALUES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];

function dim(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

function makePalette(glows) {
  const p = {};
  VALUES.forEach((v, i) => {
    const glow = glows[i];
    p[v] = { bg: dim(glow, 0.16), glow, textColor: i < 8 ? '#ffffff' : glow };
  });
  return p;
}

const PALETTES = {
  theme_neon: null, // base TILES from gameLogic
  theme_retro: makePalette([
    '#7fff00', '#9fff33', '#bfff66', '#ffb000', '#ffc233',
    '#ffd45c', '#ff9500', '#ff8000', '#ffe066', '#fff2a0', '#ffffcc',
  ]),
  theme_ocean: makePalette([
    '#00e5ff', '#00bfff', '#0099ff', '#0073ff', '#33ccff',
    '#66e0ff', '#00ffd5', '#00ffaa', '#7fffd4', '#b3ffe6', '#e0fff7',
  ]),
  theme_sakura: makePalette([
    '#ff8fb8', '#ff70a6', '#ff5290', '#ff85c2', '#ffa3d1',
    '#ffc2e0', '#ff4f9e', '#e63980', '#ffb7d9', '#ffd6ea', '#fff0f7',
  ]),
  theme_cyber: makePalette([
    '#ff00ff', '#00ffff', '#ff33cc', '#33ffee', '#ff66ff',
    '#66ffff', '#cc00ff', '#00ccff', '#ff99ff', '#99ffff', '#ffffff',
  ]),
  theme_royal: makePalette([
    '#ffd700', '#ffdf33', '#ffe766', '#e6c200', '#ccac00',
    '#b39600', '#ffcc00', '#ffc107', '#ffe082', '#fff3b8', '#fffbe0',
  ]),
};

// ── Catalog ─────────────────────────────────────────────────────────────────
export const CATALOG = [
  // Tile themes
  { id: 'theme_neon',   kind: 'theme',  name: 'Neon Night',   icon: '🌃', rarity: 'common',    isDefault: true },
  { id: 'theme_retro',  kind: 'theme',  name: 'Retro Arcade', icon: '🕹', rarity: 'common' },
  { id: 'theme_ocean',  kind: 'theme',  name: 'Deep Ocean',   icon: '🌊', rarity: 'rare' },
  { id: 'theme_sakura', kind: 'theme',  name: 'Sakura Bloom', icon: '🌸', rarity: 'rare' },
  { id: 'theme_cyber',  kind: 'theme',  name: 'Cyberpunk',    icon: '🤖', rarity: 'epic' },
  { id: 'theme_royal',  kind: 'theme',  name: 'Royal Gold',   icon: '👑', rarity: 'legendary' },
  // Merge effects (the particle burst when tiles fuse)
  { id: 'fx_sparks',    kind: 'effect', name: 'Sparks',       icon: '✨', rarity: 'common',    isDefault: true, fx: { type: 'dots' } },
  { id: 'fx_confetti',  kind: 'effect', name: 'Confetti',     icon: '🎉', rarity: 'common',    fx: { type: 'emoji', char: '🎉' } },
  { id: 'fx_snow',      kind: 'effect', name: 'Snowburst',    icon: '❄️', rarity: 'rare',      fx: { type: 'emoji', char: '❄️' } },
  { id: 'fx_hearts',    kind: 'effect', name: 'Heartpop',     icon: '💖', rarity: 'rare',      fx: { type: 'emoji', char: '💖' } },
  { id: 'fx_lightning', kind: 'effect', name: 'Thunder',      icon: '⚡', rarity: 'epic',      fx: { type: 'emoji', char: '⚡' } },
  { id: 'fx_phoenix',   kind: 'effect', name: 'Phoenix Fire', icon: '🔥', rarity: 'legendary', fx: { type: 'emoji', char: '🔥' } },
];

const DEFAULT_OWNED = CATALOG.filter(c => c.isDefault).map(c => c.id);
const DEFAULT_EQUIPPED = { theme: 'theme_neon', effect: 'fx_sparks' };

// ── Tokens ──────────────────────────────────────────────────────────────────

export async function getTokens() {
  try {
    const v = await AsyncStorage.getItem(KEYS.tokens);
    return v ? parseInt(v, 10) : 0;
  } catch { return 0; }
}

export async function addTokens(n) {
  const t = (await getTokens()) + n;
  try { await AsyncStorage.setItem(KEYS.tokens, String(t)); } catch {}
  return t;
}

// ── Collection ──────────────────────────────────────────────────────────────

export async function getOwned() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.owned);
    const ids = raw ? JSON.parse(raw) : [];
    return [...new Set([...DEFAULT_OWNED, ...ids])];
  } catch { return DEFAULT_OWNED; }
}

export async function getEquipped() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.equipped);
    return raw ? { ...DEFAULT_EQUIPPED, ...JSON.parse(raw) } : DEFAULT_EQUIPPED;
  } catch { return DEFAULT_EQUIPPED; }
}

export async function equip(id) {
  const item = CATALOG.find(c => c.id === id);
  if (!item) return;
  const owned = await getOwned();
  if (!owned.includes(id)) return;
  const eq = await getEquipped();
  eq[item.kind === 'theme' ? 'theme' : 'effect'] = id;
  try { await AsyncStorage.setItem(KEYS.equipped, JSON.stringify(eq)); } catch {}
}

// ── Drawing ─────────────────────────────────────────────────────────────────
// Rarity-weighted pick across UNOWNED items only — no duplicates, ever.
// Returns { item } | { error: 'no_tokens' } | { complete: true }.

export async function drawCard() {
  const tokens = await getTokens();
  if (tokens < 1) return { error: 'no_tokens' };

  const owned = await getOwned();
  const pool = CATALOG.filter(c => !owned.includes(c.id));
  if (pool.length === 0) return { complete: true };

  const totalWeight = pool.reduce((s, c) => s + RARITY[c.rarity].weight, 0);
  let roll = Math.random() * totalWeight;
  let item = pool[pool.length - 1];
  for (const c of pool) {
    if (roll < RARITY[c.rarity].weight) { item = c; break; }
    roll -= RARITY[c.rarity].weight;
  }

  try {
    await AsyncStorage.setItem(KEYS.tokens, String(tokens - 1));
    const ids = [...new Set([...owned, item.id])];
    await AsyncStorage.setItem(KEYS.owned, JSON.stringify(ids));
  } catch {}

  return { item };
}

// ── In-game lookups ─────────────────────────────────────────────────────────

export async function getEquippedPalette() {
  const eq = await getEquipped();
  return PALETTES[eq.theme] ?? TILES;
}

export async function getEquippedEffect() {
  const eq = await getEquipped();
  const item = CATALOG.find(c => c.id === eq.effect);
  return item?.fx ?? { type: 'dots' };
}

export function previewPalette(themeId) {
  return PALETTES[themeId] ?? TILES;
}
