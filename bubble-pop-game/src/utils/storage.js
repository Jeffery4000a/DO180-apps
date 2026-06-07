import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  highScore: 'bubble_pop_high_score',
  totalGames: 'bubble_pop_total_games',
};

export async function getHighScore() {
  try {
    const val = await AsyncStorage.getItem(KEYS.highScore);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

export async function saveHighScore(score) {
  try {
    const current = await getHighScore();
    if (score > current) {
      await AsyncStorage.setItem(KEYS.highScore, String(score));
      return true; // new record
    }
    return false;
  } catch {
    return false;
  }
}

export async function incrementTotalGames() {
  try {
    const val = await AsyncStorage.getItem(KEYS.totalGames);
    const next = (val ? parseInt(val, 10) : 0) + 1;
    await AsyncStorage.setItem(KEYS.totalGames, String(next));
    return next;
  } catch {
    return 1;
  }
}
