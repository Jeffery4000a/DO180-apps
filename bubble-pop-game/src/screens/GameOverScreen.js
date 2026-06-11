import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import BannerAdView from '../components/BannerAdView';
import useInterstitialAd from '../components/useInterstitialAd';
import useRewardedAd from '../components/useRewardedAd';
import { TILES, applyContinue, GRID_ROWS } from '../utils/gameLogic';
import { saveHighScore, saveBestTile, incrementTotalGames, todayKey, saveDailyHighScore } from '../utils/storage';
import { submitScore, getLeaderboard, flagEmoji } from '../utils/leaderboard';

const CONTINUE_SECONDS = 12; // countdown to hide the Continue offer

export default function GameOverScreen({ route, navigation }) {
  const { score, bestTileValue, savedGrid, savedScore, reason } = route.params;
  const [isNewRecord, setIsNewRecord]     = useState(false);
  const [isNewBestTile, setIsNewBestTile] = useState(false);
  const [countdown, setCountdown]         = useState(CONTINUE_SECONDS);
  const [showContinue, setShowContinue]   = useState(true);
  const [ranks, setRanks]                 = useState(null);

  const cardAnim  = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;

  const { showOnGameOver } = useInterstitialAd();

  const { loaded: continueAdReady, showAd: showContinueAd } = useRewardedAd(() => {
    // Apply continue: clear top of each full column, then restart game
    const continuedGrid = applyContinue(savedGrid);
    navigation.replace('Game', {
      continueMode: true,
      savedGrid:    continuedGrid,
      savedScore:   savedScore,
    });
  });

  useEffect(() => {
    // Save stats
    const dk = todayKey();
    Promise.all([
      saveHighScore(score).then(setIsNewRecord),
      saveBestTile(bestTileValue).then(setIsNewBestTile),
      incrementTotalGames(),
      saveDailyHighScore(dk, score),
    ]);

    // Submit to the leaderboard, then reveal the player's ranks
    submitScore(score)
      .then(() => Promise.all([getLeaderboard('global'), getLeaderboard('country')]))
      .then(([g, c]) => setRanks({
        global: g.playerRank,
        country: c.playerRank,
        geo: c.geo,
      }))
      .catch(() => {});

    // Show interstitial (throttled every 2 game overs by the hook)
    showOnGameOver();

    // Animate in
    Animated.stagger(150, [
      Animated.spring(cardAnim,  { toValue: 1, useNativeDriver: true, tension: 55 }),
      Animated.spring(scoreAnim, { toValue: 1, useNativeDriver: true, tension: 55 }),
      Animated.spring(statsAnim, { toValue: 1, useNativeDriver: true, tension: 55 }),
    ]).start();

    // Countdown to hide Continue offer
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); setShowContinue(false); return 0; }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const tileStyle = TILES[bestTileValue] ?? TILES[2048];

  return (
    <LinearGradient colors={['#060610', '#0a0a1a', '#080818']} style={styles.fill}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>

          {/* Main card */}
          <Animated.View style={[styles.card, { opacity: cardAnim, transform: [{ scale: cardAnim }] }]}>
            <Text style={styles.goEmoji}>{isNewRecord ? '🏆' : reason === 'time' ? '⏱' : '💀'}</Text>
            <Text style={styles.goTitle}>
              {isNewRecord ? 'NEW RECORD!' : reason === 'time' ? "TIME'S UP!" : 'GAME OVER'}
            </Text>

            <Animated.View style={{ opacity: scoreAnim, transform: [{ scale: scoreAnim }] }}>
              <Text style={styles.scoreLabel}>SCORE</Text>
              <Text style={styles.scoreValue}>{score.toLocaleString()}</Text>
            </Animated.View>

            {isNewRecord && (
              <View style={styles.newRecordBadge}>
                <Text style={styles.newRecordText}>✨ New best score!</Text>
              </View>
            )}
          </Animated.View>

          {/* Stats row */}
          <Animated.View style={[styles.statsRow, { opacity: statsAnim }]}>
            {/* Best tile reached */}
            <View style={[styles.statBox, { borderColor: tileStyle.glow + '80' }]}>
              <Text style={styles.statLabel}>BEST TILE</Text>
              <View style={[styles.miniTile, { backgroundColor: tileStyle.bg, borderColor: tileStyle.glow }]}>
                <Text style={[styles.miniTileText, { color: tileStyle.textColor }]}>{bestTileValue}</Text>
              </View>
              {isNewBestTile && <Text style={styles.newBadge}>NEW!</Text>}
            </View>

            {/* World + country rank */}
            {ranks && (
              <TouchableOpacity
                style={styles.statBox}
                onPress={() => navigation.navigate('Leaderboard')}
                activeOpacity={0.8}
              >
                <Text style={styles.statLabel}>YOUR RANK</Text>
                <Text style={styles.rankLine}>🌍 #{ranks.global ?? '—'}</Text>
                <Text style={styles.rankLine}>
                  {flagEmoji(ranks.geo?.code)} #{ranks.country ?? '—'}
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Continue offer (timed, disappears after countdown) */}
          {showContinue && continueAdReady && (
            <View style={styles.continueBox}>
              <Text style={styles.continueTitle}>Continue Playing?</Text>
              <Text style={styles.continueDesc}>Watch a short video — your tiles are cleared to make room.</Text>
              <TouchableOpacity style={styles.continueBtn} onPress={showContinueAd} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#ffd700', '#ff8c00']}
                  style={styles.continueBtnGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.continueBtnText}>▶  Continue  ({countdown}s)</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.playAgainBtn}
              onPress={() => navigation.replace('Game')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#7c4dff', '#00d4ff']}
                style={styles.btnGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Text style={styles.playAgainText}>PLAY AGAIN</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.lbBtn}
              onPress={() => navigation.navigate('Leaderboard')}
              activeOpacity={0.8}
            >
              <Text style={styles.lbText}>🏆  View Leaderboard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.homeBtn}
              onPress={() => navigation.navigate('Home')}
              activeOpacity={0.8}
            >
              <Text style={styles.homeText}>🏠  Home</Text>
            </TouchableOpacity>
          </View>

        </View>
        <BannerAdView />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  safe: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },

  card: {
    backgroundColor: '#ffffff09', borderRadius: 20, padding: 28,
    alignItems: 'center', width: '100%', marginBottom: 16,
    borderWidth: 1, borderColor: '#ffffff12',
  },
  goEmoji: { fontSize: 56, marginBottom: 8 },
  goTitle: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 3, marginBottom: 16 },
  scoreLabel: { color: '#555', fontSize: 12, fontWeight: '700', letterSpacing: 2, textAlign: 'center' },
  scoreValue: { color: '#7c4dff', fontSize: 60, fontWeight: '900', textAlign: 'center' },
  newRecordBadge: {
    backgroundColor: '#ffd70020', borderRadius: 50,
    paddingHorizontal: 18, paddingVertical: 6, marginTop: 10,
    borderWidth: 1, borderColor: '#ffd70060',
  },
  newRecordText: { color: '#ffd700', fontWeight: '700', fontSize: 14 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statBox: {
    alignItems: 'center', backgroundColor: '#ffffff08',
    borderRadius: 14, padding: 14, borderWidth: 1, minWidth: 100,
  },
  statLabel: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  miniTile: {
    width: 54, height: 54, borderRadius: 8, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  miniTileText: { fontWeight: '900', fontSize: 16 },
  newBadge: { color: '#ffd700', fontSize: 11, fontWeight: '800', marginTop: 6 },
  rankLine: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 3 },
  lbBtn: { alignItems: 'center', paddingVertical: 10 },
  lbText: { color: '#ffd700', fontSize: 16, fontWeight: '700' },

  continueBox: {
    backgroundColor: '#ffd70012', borderRadius: 16, padding: 18,
    width: '100%', alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: '#ffd70040',
  },
  continueTitle: { color: '#ffd700', fontSize: 17, fontWeight: '800', marginBottom: 4 },
  continueDesc: { color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 14 },
  continueBtn: { width: '100%', borderRadius: 50, overflow: 'hidden' },
  continueBtnGradient: { paddingVertical: 14, alignItems: 'center', borderRadius: 50 },
  continueBtnText: { color: '#000', fontSize: 15, fontWeight: '900' },

  buttons: { width: '100%', gap: 12 },
  playAgainBtn: { borderRadius: 50, overflow: 'hidden' },
  btnGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: 50 },
  playAgainText: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 3 },
  homeBtn: { alignItems: 'center', paddingVertical: 10 },
  homeText: { color: '#7c4dff', fontSize: 16, fontWeight: '600' },
});
