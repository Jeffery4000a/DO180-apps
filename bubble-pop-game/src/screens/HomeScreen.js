import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import BannerAdView from '../components/BannerAdView';
import { getHighScore, getBestTile } from '../utils/storage';
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

export default function HomeScreen({ navigation }) {
  const [highScore, setHighScore] = useState(0);
  const [bestTile,  setBestTile]  = useState(0);
  const titleAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const btnAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Promise.all([getHighScore(), getBestTile()]).then(([hs, bt]) => {
      setHighScore(hs);
      setBestTile(bt);
    });
    Animated.stagger(180, [
      Animated.spring(titleAnim, { toValue: 1, useNativeDriver: true, tension: 55 }),
      Animated.spring(statsAnim, { toValue: 1, useNativeDriver: true, tension: 55 }),
      Animated.spring(btnAnim,   { toValue: 1, useNativeDriver: true, tension: 55 }),
    ]).start();
  }, []);

  const bestTileStyle = bestTile ? TILES[bestTile] ?? TILES[2048] : null;

  return (
    <LinearGradient colors={['#060610', '#0a0a1a', '#08081a']} style={styles.fill}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>

        {/* Decorative falling tiles */}
        {DECO_TILES.map(t => <DecoTile key={t.id} item={t} />)}

        <View style={styles.content}>

          {/* Title */}
          <Animated.View style={[styles.titleBlock, { opacity: titleAnim, transform: [{ scale: titleAnim }] }]}>
            <Text style={styles.title}>DROP</Text>
            <Text style={styles.titleAccent}>MERGE</Text>
            <Text style={styles.subtitle}>Match · Chain · Conquer</Text>
          </Animated.View>

          {/* Stats */}
          {highScore > 0 && (
            <Animated.View style={[styles.statsRow, { opacity: statsAnim }]}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>HIGH SCORE</Text>
                <Text style={styles.statValue}>{highScore.toLocaleString()}</Text>
              </View>
              {bestTile > 0 && bestTileStyle && (
                <View style={[styles.statCard, { borderColor: bestTileStyle.glow + '80' }]}>
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
            <TouchableOpacity
              style={styles.playBtn}
              onPress={() => navigation.navigate('Game')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#7c4dff', '#00d4ff']}
                style={styles.playGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Text style={styles.playText}>PLAY</Text>
              </LinearGradient>
            </TouchableOpacity>

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

  decoTile: { position: 'absolute', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  decoTileText: { fontWeight: '900' },

  titleBlock: { alignItems: 'center', marginBottom: 36 },
  title: { fontSize: 64, fontWeight: '900', color: '#fff', letterSpacing: 4, lineHeight: 68 },
  titleAccent: { fontSize: 64, fontWeight: '900', color: '#7c4dff', letterSpacing: 4, lineHeight: 68 },
  subtitle: { fontSize: 16, color: '#555', marginTop: 10, letterSpacing: 2 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 36 },
  statCard: {
    alignItems: 'center', backgroundColor: '#ffffff09',
    borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#ffffff15', minWidth: 100,
  },
  statLabel: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  statValue: { color: '#fff', fontSize: 28, fontWeight: '900' },
  miniTile: {
    width: 48, height: 48, borderRadius: 8, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  miniTileText: { fontWeight: '900', fontSize: 15 },

  buttons: { width: '100%', alignItems: 'center', gap: 14 },
  playBtn: { borderRadius: 50, overflow: 'hidden', width: '80%' },
  playGradient: { paddingVertical: 20, alignItems: 'center', borderRadius: 50 },
  playText: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 5 },
  howBtn: { paddingVertical: 8 },
  howText: { color: '#7c4dff', fontSize: 16, fontWeight: '600' },
});
