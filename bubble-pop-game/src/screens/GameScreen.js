import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableWithoutFeedback, StyleSheet,
  Animated, Dimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { createBubble, getSpawnInterval, hitTest, GAME_DURATION } from '../utils/gameLogic';

const { width, height } = Dimensions.get('window');
const FPS = 60;
const FRAME_MS = 1000 / FPS;

// A single animated bubble rendered as a View
function Bubble({ bubble, onPop }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function handlePop() {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.6, useNativeDriver: true, speed: 60 }),
      Animated.timing(scaleAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start(() => onPop(bubble));
  }

  return (
    <TouchableWithoutFeedback onPress={handlePop}>
      <Animated.View
        style={[styles.bubble, {
          width: bubble.radius * 2,
          height: bubble.radius * 2,
          borderRadius: bubble.radius,
          backgroundColor: bubble.isBomb ? '#ff1744' : bubble.color + 'cc',
          borderColor: bubble.color,
          left: bubble.x - bubble.radius,
          top: bubble.y - bubble.radius,
          transform: [{ scale: scaleAnim }],
        }]}
      >
        <Text style={styles.bubbleIcon}>{bubble.isBomb ? '💣' : bubble.type === 'gold' ? '⭐' : '●'}</Text>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

export default function GameScreen({ navigation }) {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [bubbles, setBubbles] = useState([]);
  const [popEffects, setPopEffects] = useState([]);

  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const bubblesRef = useRef([]);
  const nextIdRef = useRef(0);
  const gameActiveRef = useRef(true);
  const lastFrameRef = useRef(null);
  const rafRef = useRef(null);
  const spawnTimerRef = useRef(null);
  const timerRef = useRef(null);

  // Physics loop — moves bubbles upward each frame
  const gameLoop = useCallback((timestamp) => {
    if (!gameActiveRef.current) return;
    const delta = lastFrameRef.current ? timestamp - lastFrameRef.current : FRAME_MS;
    lastFrameRef.current = timestamp;

    bubblesRef.current = bubblesRef.current
      .filter(b => !b.popped && b.y > -b.radius)
      .map(b => ({
        ...b,
        y: b.y - b.speed * (delta / FRAME_MS),
        x: b.x + Math.sin(b.wobble) * 0.5,
        wobble: b.wobble + b.wobbleSpeed,
      }));

    setBubbles([...bubblesRef.current]);
    rafRef.current = requestAnimationFrame(gameLoop);
  }, []);

  // Countdown timer
  const startCountdown = useCallback(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  // Spawn loop — interval shrinks as score rises
  const startSpawning = useCallback(() => {
    const spawn = () => {
      if (!gameActiveRef.current) return;
      bubblesRef.current = [...bubblesRef.current, createBubble(nextIdRef.current++)];
      const interval = getSpawnInterval(scoreRef.current);
      spawnTimerRef.current = setTimeout(spawn, interval);
    };
    spawnTimerRef.current = setTimeout(spawn, 600);
  }, []);

  function endGame() {
    gameActiveRef.current = false;
    clearInterval(timerRef.current);
    clearTimeout(spawnTimerRef.current);
    cancelAnimationFrame(rafRef.current);
    navigation.replace('GameOver', { score: scoreRef.current });
  }

  useEffect(() => {
    gameActiveRef.current = true;
    rafRef.current = requestAnimationFrame(gameLoop);
    startCountdown();
    startSpawning();

    return () => {
      gameActiveRef.current = false;
      clearInterval(timerRef.current);
      clearTimeout(spawnTimerRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function handlePop(bubble) {
    if (!gameActiveRef.current) return;

    // Mark as popped so filter removes it next frame
    bubblesRef.current = bubblesRef.current.map(b =>
      b.id === bubble.id ? { ...b, popped: true } : b
    );

    if (bubble.isBomb) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const newLives = livesRef.current - 1;
      livesRef.current = newLives;
      setLives(newLives);
      if (newLives <= 0) endGame();
    } else {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newScore = scoreRef.current + bubble.points;
      scoreRef.current = newScore;
      setScore(newScore);
      // Float-up score effect
      showPopEffect(bubble.x, bubble.y, `+${bubble.points}`);
    }
  }

  function showPopEffect(x, y, label) {
    const id = Date.now();
    setPopEffects(prev => [...prev, { id, x, y, label }]);
    setTimeout(() => {
      setPopEffects(prev => prev.filter(e => e.id !== id));
    }, 700);
  }

  // Add extra time from rewarded ad (exposed via navigation param)
  function addBonusTime(seconds) {
    setTimeLeft(t => t + seconds);
  }

  const timerColor = timeLeft > 10 ? '#00d4ff' : '#ff1744';
  const timerPct = timeLeft / GAME_DURATION;

  return (
    <LinearGradient colors={['#0a0a1a', '#0d1b3e']} style={styles.fill}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* HUD */}
        <View style={styles.hud}>
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>SCORE</Text>
            <Text style={styles.hudValue}>{score}</Text>
          </View>

          <View style={styles.timerContainer}>
            <Text style={[styles.timerText, { color: timerColor }]}>{timeLeft}</Text>
            <View style={styles.timerBar}>
              <View style={[styles.timerFill, { width: `${timerPct * 100}%`, backgroundColor: timerColor }]} />
            </View>
          </View>

          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>LIVES</Text>
            <Text style={styles.hudValue}>{'❤️'.repeat(Math.max(0, lives))}</Text>
          </View>
        </View>

        {/* Game canvas */}
        <View style={styles.canvas} pointerEvents="box-none">
          {bubbles.map(b => (
            <Bubble key={b.id} bubble={b} onPop={handlePop} />
          ))}
          {popEffects.map(e => (
            <FloatScore key={e.id} x={e.x} y={e.y} label={e.label} />
          ))}
        </View>

        {/* Hint */}
        <View style={styles.hint}>
          <Text style={styles.hintText}>Tap bubbles • Avoid 💣 bombs</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function FloatScore({ x, y, label }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -60] });
  const opacity = anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] });
  return (
    <Animated.Text style={[styles.floatScore, { left: x, top: y, transform: [{ translateY }], opacity }]}>
      {label}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  safe: { flex: 1 },
  hud: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: '#ffffff0a', borderBottomWidth: 1, borderBottomColor: '#ffffff15',
  },
  hudItem: { alignItems: 'center', minWidth: 70 },
  hudLabel: { color: '#666', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  hudValue: { color: '#fff', fontSize: 24, fontWeight: '900' },
  timerContainer: { alignItems: 'center', flex: 1, marginHorizontal: 16 },
  timerText: { fontSize: 36, fontWeight: '900' },
  timerBar: { width: '100%', height: 4, backgroundColor: '#ffffff20', borderRadius: 2, marginTop: 4 },
  timerFill: { height: 4, borderRadius: 2 },
  canvas: { flex: 1, position: 'relative' },
  bubble: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  bubbleIcon: { fontSize: 20, color: '#fff' },
  floatScore: { position: 'absolute', color: '#ffd600', fontSize: 20, fontWeight: '900' },
  hint: { alignItems: 'center', paddingVertical: 10 },
  hintText: { color: '#444', fontSize: 13 },
});
