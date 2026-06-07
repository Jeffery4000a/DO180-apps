import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import BannerAdView from '../components/BannerAdView';
import { getHighScore } from '../utils/storage';

const { width } = Dimensions.get('window');

// Decorative floating bubbles on home screen
const DECO_BUBBLES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  color: ['#00d4ff', '#7c4dff', '#ff6d00', '#ffd600', '#ff1744'][i % 5],
  size: 30 + Math.random() * 50,
  x: Math.random() * width,
  delay: i * 300,
}));

function DecoBubble({ bubble }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(bubble.delay),
        Animated.timing(anim, { toValue: 1, duration: 4000 + Math.random() * 2000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [700, -100] });
  const opacity = anim.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 0.6, 0.6, 0] });

  return (
    <Animated.View
      style={[styles.decoBubble, {
        width: bubble.size, height: bubble.size, borderRadius: bubble.size / 2,
        backgroundColor: bubble.color + '55',
        borderColor: bubble.color,
        left: bubble.x,
        transform: [{ translateY }],
        opacity,
      }]}
    />
  );
}

export default function HomeScreen({ navigation }) {
  const [highScore, setHighScore] = useState(0);
  const titleAnim = useRef(new Animated.Value(0)).current;
  const btnAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getHighScore().then(setHighScore);
    Animated.stagger(200, [
      Animated.spring(titleAnim, { toValue: 1, useNativeDriver: true, tension: 60 }),
      Animated.spring(btnAnim, { toValue: 1, useNativeDriver: true, tension: 60 }),
    ]).start();
  }, []);

  return (
    <LinearGradient colors={['#0a0a1a', '#1a0a2e', '#0d1b3e']} style={styles.fill}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        {DECO_BUBBLES.map(b => <DecoBubble key={b.id} bubble={b} />)}

        <View style={styles.content}>
          <Animated.View style={{ opacity: titleAnim, transform: [{ scale: titleAnim }] }}>
            <Text style={styles.emoji}>🫧</Text>
            <Text style={styles.title}>Bubble Pop!</Text>
            <Text style={styles.subtitle}>Tap bubbles. Dodge bombs. Beat your score.</Text>
          </Animated.View>

          {highScore > 0 && (
            <View style={styles.highScoreBox}>
              <Text style={styles.highScoreLabel}>🏆 BEST</Text>
              <Text style={styles.highScoreValue}>{highScore}</Text>
            </View>
          )}

          <Animated.View style={{ opacity: btnAnim, transform: [{ scale: btnAnim }] }}>
            <TouchableOpacity
              style={styles.playBtn}
              onPress={() => navigation.navigate('Game')}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#00d4ff', '#7c4dff']} style={styles.playGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
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
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  decoBubble: { position: 'absolute', borderWidth: 1.5 },
  emoji: { fontSize: 72, textAlign: 'center' },
  title: { fontSize: 52, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: 2 },
  subtitle: { fontSize: 16, color: '#aaa', textAlign: 'center', marginTop: 8, marginBottom: 32 },
  highScoreBox: {
    backgroundColor: '#ffffff15', borderRadius: 16, paddingHorizontal: 32, paddingVertical: 12,
    alignItems: 'center', marginBottom: 32, borderWidth: 1, borderColor: '#ffd60040',
  },
  highScoreLabel: { color: '#ffd600', fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  highScoreValue: { color: '#fff', fontSize: 40, fontWeight: '900' },
  playBtn: { borderRadius: 50, overflow: 'hidden', marginBottom: 16 },
  playGradient: { paddingVertical: 20, paddingHorizontal: 80, borderRadius: 50 },
  playText: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 4 },
  howBtn: { alignItems: 'center', paddingVertical: 8 },
  howText: { color: '#7c4dff', fontSize: 16, fontWeight: '600' },
});
