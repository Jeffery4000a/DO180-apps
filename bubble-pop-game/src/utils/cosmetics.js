import AsyncStorage from '@react-native-async-storage/async-storage';
import { TILES } from './gameLogic';

// ─────────────────────────────────────────────────────────────────────────────
// Cosmetics & card drawing — 100% visual. Nothing here changes difficulty,
// scoring, timers, or odds: every player competes on identical rules.
//
// Catalog: 30 tile THEMES (color palettes) + 100 tile DESIGNS (shape, border,
// ornament, glow — richer at every rank) + 6 merge EFFECTS = 136 collectibles
// across five ranks. Higher rank = visibly more beautiful and unique.
//
// Token economy (revenue + retention):
//   +1 token  first game of the day        (+2 at a 3-day streak, +3 at 7)
//   +2 tokens comeback gift after 2+ days away
//   +1 token  per rewarded ad watched in the Card Vault   <- ad revenue
//   1 token = 1 card draw. Draws never duplicate.
// ─────────────────────────────────────────────────────────────────────────────

const KEYS = {
  tokens:   'dm_cards_tokens',
  owned:    'dm_cards_owned',
  equipped: 'dm_cards_equipped',
};

export const RARITY = {
  common:    { label: 'Common',    color: '#9e9e9e', weight: 50 },
  rare:      { label: 'Rare',      color: '#00d4ff', weight: 28 },
  epic:      { label: 'Epic',      color: '#cc00ff', weight: 14 },
  legendary: { label: 'Legendary', color: '#ffd700', weight: 6  },
  mythic:    { label: 'Mythic',    color: '#ff2d95', weight: 2  },
};

// ── Color helpers ───────────────────────────────────────────────────────────
const VALUES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = x => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

function dim(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// Build an 11-value palette from a hue ramp h1 → h2
function rampPalette(h1, h2, s, l) {
  const p = {};
  VALUES.forEach((v, i) => {
    const glow = hslToHex(h1 + ((h2 - h1) * i) / 10, s, l);
    p[v] = { bg: dim(glow, 0.16), glow, textColor: i < 8 ? '#ffffff' : glow };
  });
  return p;
}

// ── 30 Themes ───────────────────────────────────────────────────────────────
// [name, icon, rarity, h1, h2, saturation, lightness] — null hues = base TILES
const THEME_DEFS = [
  ['Neon Night',      '🌃', 'common',    null],
  ['Retro Arcade',    '🕹️', 'common',    90,  30, 100, 55],
  ['Citrus Pop',      '🍋', 'common',    45,  90,  95, 55],
  ['Fresh Mint',      '🌿', 'common',   140, 170,  80, 55],
  ['Slate Storm',     '🌫️', 'common',   200, 230,  25, 60],
  ['Ember Glow',      '🪵', 'common',    20,  45,  90, 55],
  ['Berry Crush',     '🫐', 'common',   280, 330,  70, 60],
  ['Steel Forge',     '⚙️', 'common',   210, 210,  15, 65],
  ['Mossy Stone',     '🪨', 'common',    90, 130,  45, 50],
  ['Desert Sand',     '🏜️', 'common',    35,  55,  60, 60],
  ['Deep Ocean',      '🌊', 'rare',     180, 220,  95, 55],
  ['Sakura Bloom',    '🌸', 'rare',     320, 345,  85, 70],
  ['Aurora Veil',     '🌌', 'rare',     120, 280,  80, 60],
  ['Golden Sunset',   '🌇', 'rare',       0,  60,  95, 60],
  ['Blue Lagoon',     '🏝️', 'rare',     170, 200,  90, 60],
  ['Violet Storm',    '🌩️', 'rare',     250, 290,  85, 60],
  ['Coral Reef',      '🪸', 'rare',     350,  30,  85, 62],
  ['Jade Temple',     '🛕', 'rare',     150, 165,  75, 50],
  ['Arctic Dawn',     '🧊', 'rare',     185, 215,  70, 75],
  ['Honey Hive',      '🍯', 'rare',      40,  50,  95, 58],
  ['Cyberpunk',       '🤖', 'epic',     300, 180, 100, 60],
  ['Galaxy Core',     '🪐', 'epic',     240, 320,  90, 60],
  ['Northern Lights', '✨', 'epic',     100, 200,  90, 65],
  ['Inferno',         '🌋', 'epic',       0,  40, 100, 55],
  ['Abyssal Depth',   '🐙', 'epic',     220, 260,  80, 45],
  ['Prism Shift',     '🔮', 'epic',       0, 330,  90, 60],
  ['Royal Gold',      '👑', 'legendary',  42,  52, 100, 60],
  ['Dragonfire',      '🐉', 'legendary',   0,  30, 100, 50],
  ['Celestial',       '🌠', 'legendary', 200, 260,  95, 70],
  ['Singularity',     '🕳️', 'mythic',     0, 360, 100, 60],
];

const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '_');

const PALETTES = {};
const THEMES = THEME_DEFS.map(([name, icon, rarity, h1, h2, s, l], idx) => {
  const id = `theme_${slug(name)}`;
  PALETTES[id] = h1 === null ? null : rampPalette(h1, h2, s, l);
  return { id, kind: 'theme', name, icon, rarity, isDefault: idx === 0 };
});

// ── 100 Tile Designs ────────────────────────────────────────────────────────
// Each design styles the tile itself: shape, border, ornament, emblem, glow.
// Visual richness scales with rank — Mythic designs shimmer in previews.
const RADII = [3, 6, 10, 14, 18];

const COMMON_MATS  = ['Stone', 'Wood', 'Iron', 'Copper', 'Bronze', 'Clay', 'Glass', 'Slate', 'Pearl', 'Quartz'];
const COMMON_FORMS = ['Square', 'Round', 'Bevel', 'Frame'];                 // 10 × 4 = 40
const RARE_MATS    = ['Silver', 'Cobalt', 'Amber', 'Ivory', 'Onyx', 'Ruby', 'Topaz', 'Coral', 'Jade', 'Opal'];
const RARE_FORMS   = ['Ring', 'Edge', 'Inlay'];                             // 10 × 3 = 30
const EPIC_MATS    = ['Star', 'Diamond', 'Crystal', 'Nova', 'Comet', 'Rune'];
const EPIC_FORMS   = ['Seal', 'Sigil', 'Core'];                             // 6 × 3 = 18
const LEG_MATS     = ['Crown', 'Trident', 'Dragon'];
const LEG_FORMS    = ['Crest', 'Emblem', 'Relic'];                          // 3 × 3 = 9
const MYTHIC_NAMES = ['Singularity Core', 'Phoenix Heart', 'Infinity Prism']; // 3

const RARE_ORNAMENTS = ['·', '◦', '▫', '✛'];
const EPIC_ORNAMENTS = ['★', '◆', '❖', '✦', '♦', '✧'];
const LEG_EMBLEMS    = ['👑', '🔱', '⚜️', '🐉', '🦅', '💠', '🌟', '🛡️', '⚔️'];
const MYTHIC_EMBLEMS = ['🌌', '💎', '♾️'];
const BORDER_STYLES  = ['solid', 'dashed', 'dotted'];

function genDesigns() {
  const out = [];
  let i = 0;

  for (const m of COMMON_MATS) for (const f of COMMON_FORMS) {
    out.push({
      id: `design_c${i}`, kind: 'design', rarity: 'common',
      name: `${m} ${f}`, icon: '▫️', isDefault: i === 0,
      design: {
        radius: RADII[i % RADII.length],
        borderWidth: 1 + (i % 3) * 0.5,
        borderStyle: 'solid',
        glowBoost: 1,
      },
    });
    i++;
  }

  i = 0;
  for (const m of RARE_MATS) for (const f of RARE_FORMS) {
    out.push({
      id: `design_r${i}`, kind: 'design', rarity: 'rare',
      name: `${m} ${f}`, icon: '🔷',
      design: {
        radius: RADII[(i + 2) % RADII.length],
        borderWidth: 2,
        borderStyle: BORDER_STYLES[i % BORDER_STYLES.length],
        ornament: RARE_ORNAMENTS[i % RARE_ORNAMENTS.length],
        glowBoost: 1.3,
      },
    });
    i++;
  }

  i = 0;
  for (const m of EPIC_MATS) for (const f of EPIC_FORMS) {
    const orn = EPIC_ORNAMENTS[i % EPIC_ORNAMENTS.length];
    out.push({
      id: `design_e${i}`, kind: 'design', rarity: 'epic',
      name: `${m} ${f}`, icon: orn,
      design: {
        radius: RADII[(i + 1) % RADII.length],
        borderWidth: 2.5,
        borderStyle: BORDER_STYLES[i % BORDER_STYLES.length],
        ornament: orn,
        glowBoost: 1.7,
      },
    });
    i++;
  }

  i = 0;
  for (const m of LEG_MATS) for (const f of LEG_FORMS) {
    const emblem = LEG_EMBLEMS[i % LEG_EMBLEMS.length];
    out.push({
      id: `design_l${i}`, kind: 'design', rarity: 'legendary',
      name: `${m} ${f}`, icon: emblem,
      design: {
        radius: RADII[(i + 3) % RADII.length],
        borderWidth: 3,
        borderStyle: 'solid',
        ornament: EPIC_ORNAMENTS[i % EPIC_ORNAMENTS.length],
        emblem,
        glowBoost: 2.2,
      },
    });
    i++;
  }

  MYTHIC_NAMES.forEach((name, j) => {
    out.push({
      id: `design_m${j}`, kind: 'design', rarity: 'mythic',
      name, icon: MYTHIC_EMBLEMS[j],
      design: {
        radius: RADII[(j + 4) % RADII.length],
        borderWidth: 3,
        borderStyle: 'solid',
        ornament: '✦',
        emblem: MYTHIC_EMBLEMS[j],
        glowBoost: 3,
        shimmer: true, // animated glow in Card Vault previews
      },
    });
  });

  return out;
}

const DESIGNS = genDesigns();

// ── 10 Merge effects ────────────────────────────────────────────────────────
const EFFECTS = [
  { id: 'fx_sparks',    kind: 'effect', name: 'Sparks',       icon: '✨', rarity: 'common',    isDefault: true, fx: { type: 'dots' } },
  { id: 'fx_confetti',  kind: 'effect', name: 'Confetti',     icon: '🎉', rarity: 'common',    fx: { type: 'emoji', char: '🎉' } },
  { id: 'fx_bubbles',   kind: 'effect', name: 'Bubble Burst', icon: '🫧', rarity: 'common',    fx: { type: 'emoji', char: '🫧' } },
  { id: 'fx_snow',      kind: 'effect', name: 'Snowburst',    icon: '❄️', rarity: 'rare',      fx: { type: 'emoji', char: '❄️' } },
  { id: 'fx_hearts',    kind: 'effect', name: 'Heartpop',     icon: '💖', rarity: 'rare',      fx: { type: 'emoji', char: '💖' } },
  { id: 'fx_leaves',    kind: 'effect', name: 'Leaf Storm',   icon: '🍃', rarity: 'rare',      fx: { type: 'emoji', char: '🍃' } },
  { id: 'fx_lightning', kind: 'effect', name: 'Thunder',      icon: '⚡', rarity: 'epic',      fx: { type: 'emoji', char: '⚡' } },
  { id: 'fx_gems',      kind: 'effect', name: 'Gem Shatter',  icon: '💎', rarity: 'epic',      fx: { type: 'emoji', char: '💎' } },
  { id: 'fx_phoenix',   kind: 'effect', name: 'Phoenix Fire', icon: '🔥', rarity: 'legendary', fx: { type: 'emoji', char: '🔥' } },
  { id: 'fx_galaxy',    kind: 'effect', name: 'Galaxy Swirl', icon: '🌀', rarity: 'mythic',    fx: { type: 'emoji', char: '🌀' } },
];

// ── Catalog ─────────────────────────────────────────────────────────────────
export const CATALOG = [...THEMES, ...DESIGNS, ...EFFECTS];

const DEFAULT_OWNED = CATALOG.filter(c => c.isDefault).map(c => c.id);
const DEFAULT_EQUIPPED = {
  theme: THEMES[0].id,
  design: DESIGNS[0].id,
  effect: EFFECTS[0].id,
};

export const DEFAULT_DESIGN = DESIGNS[0].design;

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
    const eq = raw ? { ...DEFAULT_EQUIPPED, ...JSON.parse(raw) } : DEFAULT_EQUIPPED;
    // Heal stale ids from older catalog versions
    if (!CATALOG.find(c => c.id === eq.theme))  eq.theme  = DEFAULT_EQUIPPED.theme;
    if (!CATALOG.find(c => c.id === eq.design)) eq.design = DEFAULT_EQUIPPED.design;
    if (!CATALOG.find(c => c.id === eq.effect)) eq.effect = DEFAULT_EQUIPPED.effect;
    return eq;
  } catch { return DEFAULT_EQUIPPED; }
}

export async function equip(id) {
  const item = CATALOG.find(c => c.id === id);
  if (!item) return;
  const owned = await getOwned();
  if (!owned.includes(id)) return;
  const eq = await getEquipped();
  eq[item.kind] = id; // kind is 'theme' | 'design' | 'effect'
  try { await AsyncStorage.setItem(KEYS.equipped, JSON.stringify(eq)); } catch {}
}

// ── Drawing ─────────────────────────────────────────────────────────────────
// Rarity-weighted pick across UNOWNED items only — no duplicates, ever.

export async function drawCard() {
  const owned = await getOwned();
  const pool = CATALOG.filter(c => !owned.includes(c.id));
  if (pool.length === 0) return { complete: true };

  const tokens = await getTokens();
  if (tokens < 1) return { error: 'no_tokens' };

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

export async function getEquippedDesign() {
  const eq = await getEquipped();
  const item = CATALOG.find(c => c.id === eq.design);
  return item?.design ?? DEFAULT_DESIGN;
}

export async function getEquippedEffect() {
  const eq = await getEquipped();
  const item = CATALOG.find(c => c.id === eq.effect);
  return item?.fx ?? { type: 'dots' };
}

export function previewPalette(themeId) {
  return PALETTES[themeId] ?? TILES;
}
