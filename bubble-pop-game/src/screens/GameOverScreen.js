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
import { saveHighScore } from '../utils/storage';

export default function GameOverScreen({ route, navigation }) {
  const { score } = route.params;
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  const cardAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;

  const { showOnGameOver } = useInterstitialAd();

  const { loaded: rewardedLoaded, showAd: showRewardedAd } = useRewardedAd(() => {
    // Player earned reward — navigate back to game with bonus time
    setRewardClaimed(true);
    navigation.replace('Game', { bonusTime: 15 });
  });

  useEffect(() => {
    saveHighScore(score).then(newRecord => {
      setIsNewRecord(newRecord);
      if (newRecord) setHighScore(score);
    });

    // Show interstitial (throttled to every 2nd game over internally)
    showOnGameOver();

    Animated.stagger(150, [
      Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, tension: 50 }),
      Animated.spring(scoreAnim, { toValue: 1, useNativeDriver: true, tension: 50 }),
    ]).start();
  }, []);

  return (
    <LinearGradient colors={['#0a0a1a', '#1a0a2e', '#0d1b3e']} style={styles.fill}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <Animated.View style={[styles.card, { opacity: cardAnim, transform: [{ scale: cardAnim }] }]}>
            <Text style={styles.gameOverEmoji}>{isNewRecord ? '🏆' : '💥'}</Text>
            <Text style={styles.gameOverText}>{isNewRecord ? 'NEW RECORD!' : 'GAME OVER'}</Text>

            <Animated.View style={{ opacity: scoreAnim, transform: [{ scale: scoreAnim }] }}>
              <Text style={styles.scoreLabel}>SCORE</Text>
              <Text style={styles.scoreValue}>{score}</Text>
            </Animated.View>

            {isNewRecord && (
              <View style={styles.newRecordBadge}>
                <Text style={styles.newRecordText}>✨ Beat your best!</Text>
              </View>
            )}
          </Animated.View>

          {/* Rewarded ad — extra life offer */}
          {!rewardClaimed && rewardedLoaded && (
            <View style={styles.rewardBox}>
              <Text style={styles.rewardTitle}>⏱ Want +15 seconds?</Text>
              <Text style={styles.rewardDesc}>Watch a short video to continue playing!</Text>
              <TouchableOpacity style={styles.rewardBtn} onPress={showRewardedAd} activeOpacity={0.85}>
                <LinearGradient colors={['#ffd600', '#ff6d00']} style={styles.rewardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.rewardBtnText}>▶  Watch Ad  +15s</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.playAgainBtn}
              onPress={() => navigation.replace('Game')}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#00d4ff', '#7c4dff']} style={styles.btnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.playAgainText}>PLAY AGAIN</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.homeBtn}
              onPress={() => navigation.navigate('Home')}
              activeOpacity={0.8}
            >
              <Text style={styles.homeText}>🏠 Home</Text>
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
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: {
    backgroundColor: '#ffffff0d', borderRadius: 24, padding: 32,
    alignItems: 'center', width: '100%', marginBottom: 24,
    borderWidth: 1, borderColor: '#ffffff15',
  },
  gameOverEmoji: { fontSize: 64, marginBottom: 8 },
  gameOverText: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 3, marginBottom: 16 },
  scoreLabel: { color: '#666', fontSize: 13, fontWeight: '700', letterSpacing: 2, textAlign: 'center' },
  scoreValue: { color: '#00d4ff', fontSize: 72, fontWeight: '900', textAlign: 'center' },
  newRecordBadge: {
    backgroundColor: '#ffd60020', borderRadius: 50, paddingHorizontal: 20, paddingVertical: 8,
    marginTop: 8, borderWidth: 1, borderColor: '#ffd60060',
  },
  newRecordText: { color: '#ffd600', fontWeight: '700' },
  rewardBox: {
    backgroundColor: '#ffd60015', borderRadius: 20, padding: 20, width: '100%',
    alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#ffd60040',
  },
  rewardTitle: { color: '#ffd600', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  rewardDesc: { color: '#aaa', fontSize: 14, marginBottom: 14 },
  rewardBtn: { borderRadius: 50, overflow: 'hidden', width: '100%' },
  rewardGradient: { paddingVertical: 14, alignItems: 'center', borderRadius: 50 },
  rewardBtnText: { color: '#000', fontSize: 16, fontWeight: '900' },
  buttons: { width: '100%', gap: 12 },
  playAgainBtn: { borderRadius: 50, overflow: 'hidden' },
  btnGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: 50 },
  playAgainText: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 3 },
  homeBtn: { alignItems: 'center', paddingVertical: 12 },
  homeText: { color: '#7c4dff', fontSize: 16, fontWeight: '600' },
});
