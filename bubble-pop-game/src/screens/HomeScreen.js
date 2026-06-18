import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, StatusBar, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import BannerAdView from '../components/BannerAdView';
import { getHighScore, getBestTile, getStreakInfo, getDailyHighScore, todayKey } from '../utils/storage';
import { getTokens } from '../utils/cosmetics';
import { scheduleStreakReminder } from '../utils/notifications';
import { TILES, getRandomTileValue } from '../utils/gameLogic';

const { width, height } = Dimensions.get('window');

// Decorative falling tiles on the home screen
const DECO_COUNT = 10;
const DECO_TILES = Array.from({ length: DECO_COUNT }, (_, i) => ({
  id: i,
  value: [2, 4, 8, 16, 32, 64, 128, 256][i % 8],
  size: 32 + (i % 3) * 12,
  x: Math.random() * (width - 60) + 20,
  delay: i * 400,
  duration: 4000 + Math.random() * 3000,
}));

function DecoTile({ item }) {
  const anim = useRef(new Animated.Value(0)).current;
  const tileStyle = TILES[item.value];

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(item.delay),
        Animated.timing(anim, { toValue: 1, duration: item.duration, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-60, height + 60] });
  const opacity    = anim.interpolate({ inputRange: [0, 0.08, 0.9, 1], outputRange: [0, 0.25, 0.25, 0] });
  const rotate     = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  return (
    <Animated.View
      style={[
        styles.decoTile,
        {
          width: item.size, height: item.size, borderRadius: 6,
          backgroundColor: tileStyle.bg,
          borderColor: tileStyle.glow,
          left: item.x,
          transform: [{ translateY }, { rotate }],
          opacity,
        },
      ]}
    >
      <Text style={[styles.decoTileText, { color: tileStyle.textColor, fontSize: item.size * 0.4 }]}>
        {item.value}
      </Text>
    </Animated.View>
  );
}

// Aurora ambient orb component
function AuroraOrb({ color1, color2, style, floatAnim }) {
  const animStyle = floatAnim ? [style, { transform: [{ translateY: floatAnim }] }] : [style];
  return (
    <Animated.View style={[styles.auroraOrb, ...animStyle]}>
      <LinearGradient
        colors={[color1, color2, 'transparent']}
        style={styles.auroraOrbInner}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 1 }}
      />
    </Animated.View>
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
        style={styles.gradBorderOuter}
      >
        <View style={styles.gradBorderInner}>
          {children}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const [highScore, setHighScore] = useState(0);
  const [bestTile,  setBestTile]  = useState(0);
  const [dailyBest, setDailyBest] = useState(0);
  const [streak,    setStreak]    = useState({ streak: 0, playedToday: false, atRisk: false });
  const [tokens,    setTokens]    = useState(0);
  const titleAnim   = useRef(new Animated.Value(0)).current;
  const statsAnim   = useRef(new Animated.Value(0)).current;
  const btnAnim     = useRef(new Animated.Value(0)).current;
  const trophyPulse = useRef(new Animated.Value(1)).current;

  // Aurora float animations
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;

  // Shimmer animation for play button
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(trophyPulse, { toValue: 1.18, duration: 700, useNativeDriver: true }),
        Animated.timing(trophyPulse, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Aurora float loops
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim1, { toValue: -18, duration: 8000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(floatAnim1, { toValue: 0,   duration: 8000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim2, { toValue: 14, duration: 10000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(floatAnim2, { toValue: 0,  duration: 10000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    ).start();
  }, []);

  // Shimmer loop for play button
  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start();
  }, []);

  useEffect(() => {
    Promise.all([
      getHighScore(), getBestTile(), getDailyHighScore(todayKey()), getStreakInfo(), getTokens(),
    ]).then(([hs, bt, db, st, tk]) => {
      setHighScore(hs);
      setBestTile(bt);
      setDailyBest(db);
      setStreak(st);
      setTokens(tk);
      scheduleStreakReminder(st.streak); // daily 19:00 local reminder
    });
    Animated.stagger(180, [
      Animated.spring(titleAnim, { toValue: 1, useNativeDriver: true, tension: 55 }),
      Animated.spring(statsAnim, { toValue: 1, useNativeDriver: true, tension: 55 }),
      Animated.spring(btnAnim,   { toValue: 1, useNativeDriver: true, tension: 55 }),
    ]).start();
  }, []);

  const bestTileStyle = bestTile ? TILES[bestTile] ?? TILES[2048] : null;

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 400],
  });

  return (
    <LinearGradient colors={['#020209', '#06030f', '#020914']} style={styles.fill}>
      <StatusBar barStyle="light-content" />

      {/* Aurora ambient orbs */}
      <AuroraOrb
        color1="rgba(139,92,246,0.22)"
        color2="rgba(139,92,246,0.05)"
        style={styles.auroraTopLeft}
        floatAnim={floatAnim1}
      />
      <AuroraOrb
        color1="rgba(34,211,238,0.18)"
        color2="rgba(34,211,238,0.03)"
        style={styles.auroraMidRight}
        floatAnim={floatAnim2}
      />
      <AuroraOrb
        color1="rgba(232,121,249,0.20)"
        color2="rgba(232,121,249,0.04)"
        style={styles.auroraBottomCenter}
        floatAnim={null}
      />

      <SafeAreaView style={styles.safe}>

        {/* Decorative falling tiles */}
        {DECO_TILES.map(t => <DecoTile key={t.id} item={t} />)}

        <View style={styles.content}>

          {/* Title */}
          <Animated.View style={[styles.titleBlock, { opacity: titleAnim, transform: [{ scale: titleAnim }] }]}>
            <Text style={styles.title}>DROP</Text>
            <Text style={styles.titleAccent}>MERGE</Text>
            {/* Gradient divider */}
            <LinearGradient
              colors={['transparent', '#8B5CF6', '#22d3ee', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.titleDivider}
            />
            <Text style={styles.subtitle}>Stack · Chain · Conquer</Text>
          </Animated.View>

          {/* Daily streak */}
          {streak.streak > 0 && (
            <Animated.View style={{ opacity: statsAnim }}>
              {streak.atRisk ? (
                <LinearGradient
                  colors={['rgba(232,121,249,0.15)', 'rgba(232,121,249,0.05)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.streakChip, styles.streakChipGlow, { borderColor: '#e879f9' }]}
                >
                  <Animated.Text style={[styles.streakText, { color: '#e879f9', transform: [{ scale: trophyPulse }] }]}>
                    🔥 {streak.streak}-day streak — play today to keep it!
                  </Animated.Text>
                </LinearGradient>
              ) : (
                <LinearGradient
                  colors={['rgba(251,191,36,0.12)', 'rgba(251,191,36,0.04)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.streakChip, { borderColor: '#FBBF2460' }]}
                >
                  <Text style={[styles.streakText, { color: '#FBBF24' }]}>
                    🔥 {streak.streak}-day streak
                  </Text>
                </LinearGradient>
              )}
            </Animated.View>
          )}

          {/* Stats */}
          {highScore > 0 && (
            <Animated.View style={[styles.statsRow, { opacity: statsAnim }]}>
              <View style={[styles.statCard, { overflow: 'hidden' }]}>
                <View style={[styles.statCardAccent, { backgroundColor: '#8B5CF6' }]} />
                <Text style={styles.statLabel}>HIGH SCORE</Text>
                <Text style={[styles.statValue, {
                  textShadowColor: 'rgba(139,92,246,0.7)',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 10,
                }]}>{highScore.toLocaleString()}</Text>
              </View>
              {dailyBest > 0 && (
                <View style={[styles.statCard, { overflow: 'hidden' }]}>
                  <View style={[styles.statCardAccent, { backgroundColor: '#22d3ee' }]} />
                  <Text style={styles.statLabel}>TODAY</Text>
                  <Text style={[styles.statValue, {
                    textShadowColor: 'rgba(34,211,238,0.7)',
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 10,
                  }]}>{dailyBest.toLocaleString()}</Text>
                </View>
              )}
              {bestTile > 0 && bestTileStyle && (
                <View style={[styles.statCard, { overflow: 'hidden' }]}>
                  <View style={[styles.statCardAccent, { backgroundColor: '#FBBF24' }]} />
                  <Text style={styles.statLabel}>BEST TILE</Text>
                  <View style={[styles.miniTile, { backgroundColor: bestTileStyle.bg, borderColor: bestTileStyle.glow }]}>
                    <Text style={[styles.miniTileText, { color: bestTileStyle.textColor }]}>{bestTile}</Text>
                  </View>
                </View>
              )}
            </Animated.View>
          )}

          {/* Buttons */}
          <Animated.View style={[styles.buttons, { opacity: btnAnim, transform: [{ scale: btnAnim }] }]}>
            {/* Shimmer Play Button */}
            <TouchableOpacity
              style={styles.playBtn}
              onPress={() => navigation.navigate('Game')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#4C1D95', '#7C3AED', '#0891B2']}
                style={styles.playGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Text style={styles.playText}>PLAY</Text>
                {/* Shimmer overlay */}
                <Animated.View
                  style={[
                    styles.shimmerOverlay,
                    { transform: [{ translateX: shimmerTranslateX }, { skewX: '-25deg' }] },
                  ]}
                  pointerEvents="none"
                />
              </LinearGradient>
            </TouchableOpacity>

            {/* Secondary buttons row */}
            <View style={styles.secondaryRow}>
              <GradientBorderButton
                gradientColors={['#FBBF24', '#F59E0B', '#D97706']}
                onPress={() => navigation.navigate('Leaderboard')}
                style={styles.secondaryBtnWrapper}
              >
                <View style={styles.secondaryBtnContent}>
                  <Animated.Text style={[styles.lbTrophy, { transform: [{ scale: trophyPulse }] }]}>🏆</Animated.Text>
                  <Text style={styles.lbText}>Leaderboard</Text>
                </View>
              </GradientBorderButton>

              <GradientBorderButton
                gradientColors={['#8B5CF6', '#7C3AED', '#6D28D9']}
                onPress={() => navigation.navigate('CardVault')}
                style={styles.secondaryBtnWrapper}
              >
                <View style={styles.secondaryBtnContent}>
                  <Text style={styles.vaultIcon}>🎴</Text>
                  <Text style={styles.vaultText}>Card Vault</Text>
                  {tokens > 0 && (
                    <View style={styles.tokenBadge}>
                      <Text style={styles.tokenBadgeText}>🪙 {tokens}</Text>
                    </View>
                  )}
                </View>
              </GradientBorderButton>
            </View>

            <TouchableOpacity
              style={styles.howBtn}
              onPress={() => navigation.navigate('HowToPlay')}
              activeOpacity={0.8}
            >
              <Text style={styles.howText}>How to Play</Text>
            </TouchableOpacity>
          </Animated.View>

        </View>

        <BannerAdView />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  safe: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },

  // Aurora orbs
  auroraOrb: { position: 'absolute', borderRadius: 999 },
  auroraOrbInner: { width: '100%', height: '100%', borderRadius: 999 },
  auroraTopLeft: { width: 300, height: 300, top: -60, left: -80 },
  auroraMidRight: { width: 260, height: 260, top: height * 0.3, right: -80 },
  auroraBottomCenter: { width: 280, height: 280, bottom: 60, left: width * 0.5 - 140 },

  decoTile: { position: 'absolute', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  decoTileText: { fontWeight: '900' },

  titleBlock: { alignItems: 'center', marginBottom: 28 },
  title: {
    fontSize: 68, fontWeight: '900', color: '#fff', letterSpacing: 6, lineHeight: 72,
    textShadowColor: 'rgba(139,92,246,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  titleAccent: {
    fontSize: 68, fontWeight: '900', color: '#8B5CF6', letterSpacing: 6, lineHeight: 72,
    textShadowColor: 'rgba(139,92,246,0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  titleDivider: { width: 220, height: 1.5, marginVertical: 14 },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2, letterSpacing: 4, fontWeight: '600' },

  streakChip: {
    borderRadius: 50,
    paddingHorizontal: 22, paddingVertical: 10,
    borderWidth: 1, marginBottom: 18,
  },
  streakChipGlow: { borderWidth: 1.5 },
  streakText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  statCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, paddingTop: 0, paddingBottom: 14, paddingHorizontal: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', minWidth: 95,
  },
  statCardAccent: { height: 3, width: '100%', marginBottom: 12 },
  statLabel: { color: '#64748B', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  statValue: { color: '#fff', fontSize: 26, fontWeight: '900' },
  miniTile: {
    width: 48, height: 48, borderRadius: 8, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  miniTileText: { fontWeight: '900', fontSize: 15 },

  buttons: { width: '100%', alignItems: 'center', gap: 14 },
  playBtn: { borderRadius: 50, overflow: 'hidden', width: '90%' },
  playGradient: { paddingVertical: 20, alignItems: 'center', borderRadius: 50, overflow: 'hidden' },
  playText: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 6 },
  shimmerOverlay: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  secondaryRow: { flexDirection: 'row', gap: 12, width: '90%' },
  secondaryBtnWrapper: { flex: 1 },
  gradBorderOuter: { borderRadius: 50, padding: 1.5 },
  gradBorderInner: {
    backgroundColor: '#07021a',
    borderRadius: 50,
    paddingVertical: 13,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 7, justifyContent: 'center' },

  lbTrophy: { fontSize: 18 },
  lbText: { color: '#FBBF24', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  vaultIcon: { fontSize: 18 },
  vaultText: { color: '#8B5CF6', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  tokenBadge: {
    backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 50,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.4)',
  },
  tokenBadgeText: { color: '#FBBF24', fontSize: 11, fontWeight: '900' },

  howBtn: { paddingVertical: 8 },
  howText: {
    color: '#64748B', fontSize: 14, fontWeight: '600',
    textDecorationLine: 'underline',
    textDecorationColor: '#64748B',
  },
});
