import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  highScore:  'drop_merge_high_score',
  totalGames: 'drop_merge_total_games',
  bestTile:   'drop_merge_best_tile',
  dailyBase:  'drop_merge_daily_',      // append YYYY-MM-DD
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
