import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar, Easing,
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

// Aurora ambient orb component
function AuroraOrb({ color1, color2, style }) {
  return (
    <View style={[goStyles.auroraOrb, style]}>
      <LinearGradient
        colors={[color1, color2, 'transparent']}
        style={goStyles.auroraOrbInner}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 1 }}
      />
    </View>
  );
}

// Gradient border button component
function GradientBorderButton({ gradientColors, onPress, children, style }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={style}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={goStyles.gradBorderOuter}
      >
        <View style={goStyles.gradBorderInner}>
          {children}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

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

  // Countdown pulse for continue offer
  const countdownPulse = useRef(new Animated.Value(1)).current;

  // Shimmer animation for play again button
  const shimmerAnim = useRef(new Animated.Value(0)).current;

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

    // Countdown pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(countdownPulse, { toValue: 1.15, duration: 500, useNativeDriver: true }),
        Animated.timing(countdownPulse, { toValue: 1,    duration: 500, useNativeDriver: true }),
      ])
    ).start();

    // Shimmer for play again button
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start();

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

  // Determine aurora colors based on game state
  const auroraConfig = isNewRecord
    ? { orb1: ['rgba(139,92,246,0.25)', 'rgba(139,92,246,0.05)'], orb2: ['rgba(232,121,249,0.20)', 'rgba(232,121,249,0.04)'] }
    : reason === 'time'
    ? { orb1: ['rgba(255,68,0,0.22)', 'rgba(255,68,0,0.05)'],   orb2: ['rgba(255,145,0,0.18)', 'rgba(255,145,0,0.04)'] }
    : { orb1: ['rgba(139,92,246,0.20)', 'rgba(139,92,246,0.04)'], orb2: ['rgba(34,211,238,0.18)', 'rgba(34,211,238,0.04)'] };

  const titleColor = isNewRecord ? '#FBBF24' : reason === 'time' ? '#22d3ee' : '#8B5CF6';
  const titleGlow = isNewRecord ? 'rgba(251,191,36,0.8)' : reason === 'time' ? 'rgba(34,211,238,0.8)' : 'rgba(139,92,246,0.8)';

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 400],
  });

  return (
    <LinearGradient colors={['#020209', '#06030f', '#020914']} style={goStyles.fill}>
      <StatusBar barStyle="light-content" />

      {/* Aurora ambient orbs */}
      <AuroraOrb
        color1={auroraConfig.orb1[0]}
        color2={auroraConfig.orb1[1]}
        style={goStyles.auroraTopLeft}
      />
      <AuroraOrb
        color1={auroraConfig.orb2[0]}
        color2={auroraConfig.orb2[1]}
        style={goStyles.auroraBottomRight}
      />

      <SafeAreaView style={goStyles.safe}>
        <View style={goStyles.content}>

          {/* Score hero — number is the visual hero */}
          <Animated.View style={[goStyles.scoreHero, { opacity: cardAnim, transform: [{ scale: cardAnim }] }]}>
            <Text style={goStyles.scoreLabel}>SCORE</Text>
            <Animated.View style={{ opacity: scoreAnim, transform: [{ scale: scoreAnim }] }}>
              <Text style={[goStyles.scoreValue, {
                textShadowColor: 'rgba(139,92,246,0.8)',
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 20,
              }]}>{score.toLocaleString()}</Text>
            </Animated.View>

            {/* Title below score */}
            <Text style={[goStyles.goTitle, {
              color: titleColor,
              textShadowColor: titleGlow,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 16,
            }]}>
              {isNewRecord ? 'NEW RECORD 🏆' : reason === 'time' ? "TIME'S UP ⏱" : 'GAME OVER'}
            </Text>

            {isNewRecord && (
              <View style={goStyles.newRecordBadge}>
                <Text style={goStyles.newRecordText}>✨ New best score!</Text>
              </View>
            )}
          </Animated.View>

          {/* Stats row */}
          <Animated.View style={[goStyles.statsRow, { opacity: statsAnim }]}>
            {/* Best tile reached — gold gradient border */}
            <GradientBorderButton
              gradientColors={['#FBBF24', '#F59E0B', '#D97706']}
              onPress={() => {}}
              style={goStyles.statBoxWrapper}
            >
              <View style={goStyles.statBoxContent}>
                <Text style={goStyles.statLabel}>BEST TILE</Text>
                <View style={[goStyles.miniTile, { backgroundColor: tileStyle.bg, borderColor: tileStyle.glow }]}>
                  <Text style={[goStyles.miniTileText, { color: tileStyle.textColor }]}>{bestTileValue}</Text>
                </View>
                {isNewBestTile && <Text style={goStyles.newBadge}>NEW!</Text>}
              </View>
            </GradientBorderButton>

            {/* World + country rank */}
            {ranks && (
              <GradientBorderButton
                gradientColors={['#8B5CF6', '#7C3AED', '#22d3ee']}
                onPress={() => navigation.navigate('Leaderboard')}
                style={goStyles.statBoxWrapper}
              >
                <View style={goStyles.statBoxContent}>
                  <Text style={goStyles.statLabel}>YOUR RANK</Text>
                  <Text style={[goStyles.rankLine, {
                    textShadowColor: 'rgba(139,92,246,0.6)',
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 8,
                  }]}>🌍 #{ranks.global ?? '—'}</Text>
                  <Text style={[goStyles.rankLine, {
                    color: '#22d3ee',
                    textShadowColor: 'rgba(34,211,238,0.6)',
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 8,
                  }]}>
                    {flagEmoji(ranks.geo?.code)} #{ranks.country ?? '—'}
                  </Text>
                </View>
              </GradientBorderButton>
            )}
          </Animated.View>

          {/* Continue offer (timed, disappears after countdown) */}
          {showContinue && continueAdReady && (
            <View style={goStyles.continueBox}>
              <Text style={goStyles.continueTitle}>Continue Playing?</Text>
              <Text style={goStyles.continueDesc}>Watch a short video — your tiles are cleared to make room.</Text>
              <TouchableOpacity style={goStyles.continueBtn} onPress={showContinueAd} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#ffd700', '#ff8c00']}
                  style={goStyles.continueBtnGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  <Text style={goStyles.continueBtnText}>▶  Continue  </Text>
                  <Animated.Text style={[goStyles.countdownNum, { transform: [{ scale: countdownPulse }] }]}>
                    {countdown}s
                  </Animated.Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Action buttons */}
          <View style={goStyles.buttons}>
            {/* Play Again — shimmer gradient button */}
            <TouchableOpacity
              style={goStyles.playAgainBtn}
              onPress={() => navigation.replace('Game')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#4C1D95', '#7C3AED', '#0891B2']}
                style={goStyles.btnGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Text style={goStyles.playAgainText}>PLAY AGAIN</Text>
                <Animated.View
                  style={[
                    goStyles.shimmerOverlay,
                    { transform: [{ translateX: shimmerTranslateX }, { skewX: '-25deg' }] },
                  ]}
                  pointerEvents="none"
                />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={goStyles.lbBtn}
              onPress={() => navigation.navigate('Leaderboard')}
              activeOpacity={0.8}
            >
              <Text style={goStyles.lbText}>🏆  View Leaderboard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={goStyles.homeBtn}
              onPress={() => navigation.navigate('Home')}
              activeOpacity={0.8}
            >
              <Text style={goStyles.homeText}>🏠  Home</Text>
            </TouchableOpacity>
          </View>

        </View>
        <BannerAdView />
      </SafeAreaView>
    </LinearGradient>
  );
}

const goStyles = StyleSheet.create({
  fill: { flex: 1 },
  safe: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },

  // Aurora orbs
  auroraOrb: { position: 'absolute', borderRadius: 999 },
  auroraOrbInner: { width: '100%', height: '100%', borderRadius: 999 },
  auroraTopLeft: { width: 320, height: 320, top: -80, left: -100 },
  auroraBottomRight: { width: 280, height: 280, bottom: 20, right: -80 },

  // Score hero section
  scoreHero: {
    alignItems: 'center', width: '100%', marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 24, padding: 28,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
  },
  scoreLabel: { color: '#64748B', fontSize: 11, fontWeight: '700', letterSpacing: 3, marginBottom: 6 },
  scoreValue: { color: '#fff', fontSize: 72, fontWeight: '900', textAlign: 'center', lineHeight: 80 },
  goTitle: { fontSize: 20, fontWeight: '900', letterSpacing: 2, marginTop: 10, textAlign: 'center' },
  newRecordBadge: {
    backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 50,
    paddingHorizontal: 18, paddingVertical: 6, marginTop: 12,
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.4)',
  },
  newRecordText: { color: '#FBBF24', fontWeight: '700', fontSize: 13 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16, width: '100%' },
  statBoxWrapper: { flex: 1 },
  gradBorderOuter: { borderRadius: 18, padding: 1.5 },
  gradBorderInner: {
    backgroundColor: '#07021a',
    borderRadius: 17,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBoxContent: { alignItems: 'center' },
  statLabel: { color: '#64748B', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  miniTile: {
    width: 54, height: 54, borderRadius: 10, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  miniTileText: { fontWeight: '900', fontSize: 16 },
  newBadge: { color: '#FBBF24', fontSize: 11, fontWeight: '800', marginTop: 6 },
  rankLine: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 4 },

  continueBox: {
    backgroundColor: 'rgba(251,191,36,0.07)', borderRadius: 20, padding: 18,
    width: '100%', alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)',
  },
  continueTitle: { color: '#FBBF24', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  continueDesc: { color: '#64748B', fontSize: 12, textAlign: 'center', marginBottom: 14 },
  continueBtn: { width: '100%', borderRadius: 50, overflow: 'hidden' },
  continueBtnGradient: { paddingVertical: 14, alignItems: 'center', borderRadius: 50, flexDirection: 'row', justifyContent: 'center' },
  continueBtnText: { color: '#000', fontSize: 15, fontWeight: '900' },
  countdownNum: { color: '#000', fontSize: 18, fontWeight: '900' },

  buttons: { width: '100%', gap: 12 },
  playAgainBtn: { borderRadius: 50, overflow: 'hidden' },
  btnGradient: { paddingVertical: 18, alignItems: 'center', borderRadius: 50, overflow: 'hidden' },
  playAgainText: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 4 },
  shimmerOverlay: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  lbBtn: { alignItems: 'center', paddingVertical: 10 },
  lbText: { color: '#FBBF24', fontSize: 15, fontWeight: '700' },
  homeBtn: { alignItems: 'center', paddingVertical: 8 },
  homeText: {
    color: '#64748B', fontSize: 14, fontWeight: '600',
    textDecorationLine: 'underline',
    textDecorationColor: '#64748B',
  },
});
