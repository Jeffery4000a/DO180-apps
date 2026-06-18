import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  highScore:  'drop_merge_high_score',
  totalGames: 'drop_merge_total_games',
  bestTile:   'drop_merge_best_tile',
  dailyBase:  'drop_merge_daily_',      // append YYYY-MM-DD
  streak:     'drop_merge_streak',
  lastDay:    'drop_merge_last_day',
  gift:       'drop_merge_comeback_gift',
};

async function getInt(key, fallback = 0) {
  try {
    const val = await AsyncStorage.getItem(key);
    return val ? parseInt(val, 10) : fallback;
  } catch { return fallback; }
}

async function setInt(key, value) {
  try { await AsyncStorage.setItem(key, String(value)); } catch {}
}

export async function getHighScore() {
  return getInt(KEYS.highScore);
}

export async function saveHighScore(score) {
  const current = await getHighScore();
  if (score > current) { await setInt(KEYS.highScore, score); return true; }
  return false;
}

export async function getBestTile() {
  return getInt(KEYS.bestTile);
}

export async function saveBestTile(value) {
  const current = await getBestTile();
  if (value > current) { await setInt(KEYS.bestTile, value); return true; }
  return false;
}

export async function getDailyHighScore(dateKey) {
  return getInt(KEYS.dailyBase + dateKey);
}

export async function saveDailyHighScore(dateKey, score) {
  const current = await getDailyHighScore(dateKey);
  if (score > current) { await setInt(KEYS.dailyBase + dateKey, score); return true; }
  return false;
}

export async function incrementTotalGames() {
  const next = (await getInt(KEYS.totalGames)) + 1;
  await setInt(KEYS.totalGames, next);
  return next;
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// ── Daily streak (retention) ────────────────────────────────────────────────

function dayDiff(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

// Call when a game starts. Updates the streak and returns it.
// Streak rules: same day = unchanged · next day = +1 · gap >= 2 days =
// reset to 1 AND a comeback gift (a free bomb) is banked.
export async function recordPlayAndGetStreak() {
  const today = todayKey();
  let last = null, streak = 0;
  try {
    last = await AsyncStorage.getItem(KEYS.lastDay);
    streak = await getInt(KEYS.streak);
  } catch {}

  let comeback = false;
  const firstToday = last !== today;
  if (last === today) {
    streak = Math.max(streak, 1);
  } else if (last && dayDiff(last, today) === 1) {
    streak += 1;
  } else {
    comeback = !!last && dayDiff(last, today) >= 2;
    streak = 1;
    if (comeback) {
      try { await AsyncStorage.setItem(KEYS.gift, '1'); } catch {}
    }
  }

  try {
    await AsyncStorage.setItem(KEYS.lastDay, today);
    await setInt(KEYS.streak, streak);
  } catch {}
  return { streak, comeback, firstToday };
}

// For display on the home screen — does NOT update anything.
export async function getStreakInfo() {
  let last = null, streak = 0;
  try {
    last = await AsyncStorage.getItem(KEYS.lastDay);
    streak = await getInt(KEYS.streak);
  } catch {}
  if (!last) return { streak: 0, playedToday: false, atRisk: false };
  const diff = dayDiff(last, todayKey());
  if (diff === 0) return { streak, playedToday: true, atRisk: false };
  if (diff === 1) return { streak, playedToday: false, atRisk: true }; // play today or lose it
  return { streak: 0, playedToday: false, atRisk: false };             // already broken
}

// One-shot comeback gift: true exactly once after a 2+ day absence.
export async function consumeComebackGift() {
  try {
    const v = await AsyncStorage.getItem(KEYS.gift);
    if (v === '1') {
      await AsyncStorage.removeItem(KEYS.gift);
      return true;
    }
  } catch {}
  return false;
}
