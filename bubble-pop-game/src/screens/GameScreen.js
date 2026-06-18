import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Platform, StatusBar, AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import useRewardedAd from '../components/useRewardedAd';
import { recordPlayAndGetStreak, consumeComebackGift } from '../utils/storage';
import { getEquippedPalette, getEquippedEffect, getEquippedDesign, addTokens } from '../utils/cosmetics';
import {
  GRID_COLS, GRID_ROWS, TILE_SIZE, TILES,
  createEmptyGrid, canDropInCol, isGameOver, getMaxTile,
  dropTile, bombColumn, applyContinue,
  getRandomTileValue, tileFontSize,
} from '../utils/gameLogic';

// ── Gold Rush / combo tuning ─────────────────────────────────────────────────
const WILD_COUNT     = 5;    // wildcard tiles per gold rush
const RUSH_MULT      = 3;    // score multiplier during gold rush
const MAX_COMBO_MULT = 5;
const METER_MAX      = 100;
const COMBO_COLORS   = ['#00d4ff', '#00d4ff', '#7c4dff', '#ff7700', '#ffd700', '#ffd700'];

const INDICATOR_H = 22; // matches styles.dropIndicator height

// ── Tension timer tuning ─────────────────────────────────────────────────────
const TIMER_START = 30;   // seconds at game start
const TIMER_MAX   = 60;   // cap — merges can bank up to this much
const TICK_MS     = 100;  // drain resolution
// Drain accelerates gently as the score grows (up to 2x at ~12k points)
function drainRate(score) {
  return Math.min(2, 1 + score / 12000);
}
// Seconds earned per merge: deeper chains pay more, 2048 pays a jackpot
function timeReward(chainLen, formed2048) {
  return chainLen * 1.5 + (formed2048 ? 5 : 0);
}

function comboColor(combo) {
  return COMBO_COLORS[Math.min(combo, COMBO_COLORS.length - 1)];
}

// ─── Tile Cell ────────────────────────────────────────────────────────────────

function TileCell({ tile, animValue, size, palette = TILES, design }) {
  const isWild = tile?.wild;
  const style = tile && !isWild ? palette[tile.value] ?? palette[2048] : null;
  const fontSize = tile ? tileFontSize(isWild ? 2 : tile.value) : 14;
  const glowBoost = design?.glowBoost ?? 1;

  return (
    <Animated.View
      style={[
        styles.cell,
        { width: size, height: size, borderRadius: design?.radius ?? 6 },
        style && {
          backgroundColor: style.bg,
          borderColor: style.glow,
          borderWidth: design?.borderWidth ?? 1.5,
          borderStyle: design?.borderStyle ?? 'solid',
          shadowColor: style.glow,
          shadowOpacity: Math.min(1, 0.5 * glowBoost),
          shadowRadius: 4 * glowBoost,
          elevation: Math.round(4 * glowBoost),
        },
        isWild && styles.wildCell,
        animValue && { transform: [{ scale: animValue }] },
      ]}
    >
      {tile && (
        isWild
          ? <Text style={[styles.wildStar, { fontSize: size * 0.5 }]}>★</Text>
          : <Text style={[styles.tileText, { fontSize, color: style.textColor }]}>{tile.value}</Text>
      )}
      {tile && !isWild && design?.ornament && (
        <Text style={[styles.cellOrnament, { color: style.glow, fontSize: size * 0.2 }]}>
          {design.ornament}
        </Text>
      )}
      {tile && !isWild && design?.emblem && (
        <Text style={[styles.cellEmblem, { fontSize: size * 0.22 }]}>{design.emblem}</Text>
      )}
    </Animated.View>
  );
}

// ─── Floating score popup ─────────────────────────────────────────────────────

function FloatLabel({ x, y, text, color }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 750, useNativeDriver: true }).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -55] });
  const opacity    = anim.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 1, 0] });
  return (
    <Animated.Text
      style={[styles.floatLabel, { left: x, top: y, color, transform: [{ translateY }], opacity }]}
      pointerEvents="none"
    >
      {text}
    </Animated.Text>
  );
}

// ─── Particle burst ───────────────────────────────────────────────────────────

const BURST_DIRS = Array.from({ length: 7 }, (_, i) => {
  const a = (i / 7) * Math.PI * 2 + 0.4;
  return { dx: Math.cos(a) * 32, dy: Math.sin(a) * 32 };
});

function Burst({ x, y, color, fx }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 520, useNativeDriver: true }).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.8, 0] });
  const isEmoji = fx?.type === 'emoji';
  return (
    <View style={[styles.burstWrap, { left: x, top: y }]} pointerEvents="none">
      {BURST_DIRS.map((d, i) => {
        const move = {
          opacity,
          transform: [
            { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, d.dx] }) },
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, d.dy] }) },
          ],
        };
        return isEmoji ? (
          <Animated.Text key={i} style={[styles.burstEmoji, move]}>{fx.char}</Animated.Text>
        ) : (
          <Animated.View key={i} style={[styles.burstDot, { backgroundColor: color }, move]} />
        );
      })}
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTile(id, value) {
  return { id, value };
}
function makeWildTile(id) {
  return { id, value: 0, wild: true };
}

// ─── Gradient border control button ──────────────────────────────────────────

function GradBorderBtn({ gradientColors, onPress, disabled, style, children }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.8} style={[disabled && styles.btnDisabled, style]}>
      <LinearGradient
        colors={disabled ? ['#333', '#222'] : gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradBtnOuter}
      >
        <View style={styles.gradBtnInner}>
          {children}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Game Screen ──────────────────────────────────────────────────────────────

export default function GameScreen({ route, navigation }) {
  const continueMode = route.params?.continueMode ?? false;
  const savedGrid    = route.params?.savedGrid    ?? null;
  const savedScore   = route.params?.savedScore   ?? 0;

  // ── State ─────────────────────────────────────────────────────────────────
  const initGrid = useCallback(() => {
    if (continueMode && savedGrid) return applyContinue(savedGrid);
    return createEmptyGrid();
  }, []);

  const [grid,        setGrid]        = useState(initGrid);
  const [score,       setScore]       = useState(continueMode ? savedScore : 0);
  const [shownScore,  setShownScore]  = useState(continueMode ? savedScore : 0);
  const [currentTile, setCurrentTile] = useState(() => makeTile('t0', getRandomTileValue()));
  const [nextTile,    setNextTile]    = useState(() => makeTile('t1', getRandomTileValue()));
  const [undosLeft,   setUndosLeft]   = useState(3);
  const [bombReady,   setBombReady]   = useState(false);
  const [bombMode,    setBombMode]    = useState(false);
  const [gameEnded,   setGameEnded]   = useState(false);

  // Tension timer
  const [timeLeft,  setTimeLeft]  = useState(TIMER_START);
  const [timeGain,  setTimeGain]  = useState(null);   // "+3s" popup near the timer
  const timeRef      = useRef(TIMER_START);
  const endedRef     = useRef(false);
  const appActiveRef = useRef(true);
  const timerPulse   = useRef(new Animated.Value(1)).current;
  const gainAnim     = useRef(new Animated.Value(0)).current;

  // Juice state
  const [combo,     setCombo]     = useState(0);
  const [meter,     setMeter]     = useState(0);
  const [goldRush,  setGoldRush]  = useState(false);
  const [wildLeft,  setWildLeft]  = useState(0);
  const [floats,    setFloats]    = useState([]);   // floating score labels
  const [bursts,    setBursts]    = useState([]);   // particle bursts

  // Equipped cosmetics (visual only — identical gameplay for everyone)
  const [palette, setPalette]   = useState(TILES);
  const [mergeFx, setMergeFx]   = useState({ type: 'dots' });
  const [tileDesign, setTileDesign] = useState(null);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const gridRef     = useRef(grid);
  const scoreRef    = useRef(continueMode ? savedScore : 0);
  const tileCounter = useRef(2);
  const prevGrid    = useRef(null);
  const prevScore   = useRef(null);
  const prevCurrent = useRef(null);
  const meterRef    = useRef(0);
  const wildLeftRef = useRef(0);
  const fxId        = useRef(0);

  const animRefs = useRef({});
  const colPressAnims = useRef(Array.from({ length: GRID_COLS }, () => new Animated.Value(1)));
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const comboAnim = useRef(new Animated.Value(0)).current;
  const rushPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (continueMode && savedGrid) {
      let maxNum = 1;
      for (const col of savedGrid) {
        for (const tile of col) {
          animRefs.current[tile.id] = new Animated.Value(1);
          const n = parseInt(tile.id.slice(1), 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }
      tileCounter.current = maxNum + 1;
    }
    animRefs.current['t0'] = new Animated.Value(1);
    animRefs.current['t1'] = new Animated.Value(1);
  }, []);

  // Equipped cosmetics + daily retention rewards (card tokens, never
  // gameplay advantages — the playing field stays level).
  useEffect(() => {
    getEquippedPalette().then(setPalette);
    getEquippedEffect().then(setMergeFx);
    getEquippedDesign().then(setTileDesign);
    if (!continueMode) {
      recordPlayAndGetStreak().then(({ streak, firstToday }) => {
        if (firstToday) {
          addTokens(streak >= 7 ? 3 : streak >= 3 ? 2 : 1);
        }
      });
      consumeComebackGift().then(gift => { if (gift) addTokens(2); });
    }
  }, []);

  // Score counts up toward the real value instead of jumping
  useEffect(() => {
    if (shownScore === score) return;
    const step = Math.max(1, Math.ceil((score - shownScore) / 6));
    const t = setTimeout(() => setShownScore(s => Math.min(score, s + step)), 28);
    return () => clearTimeout(t);
  }, [score, shownScore]);

  // Tension timer: drains continuously, pauses while the app is backgrounded
  // (so full-screen ads don't burn the player's clock).
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      appActiveRef.current = s === 'active';
    });
    const tick = setInterval(() => {
      if (endedRef.current || !appActiveRef.current) return;
      timeRef.current -= (TICK_MS / 1000) * drainRate(scoreRef.current);
      if (timeRef.current <= 0) {
        timeRef.current = 0;
        setTimeLeft(0);
        triggerGameOver(gridRef.current, scoreRef.current, 'time');
        return;
      }
      setTimeLeft(Math.ceil(timeRef.current));
    }, TICK_MS);
    return () => { clearInterval(tick); sub.remove(); };
  }, []);

  // Heartbeat pulse on the timer when under 8 seconds
  useEffect(() => {
    if (timeLeft > 8 || timeLeft <= 0) { timerPulse.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(timerPulse, { toValue: 1.25, duration: 280, useNativeDriver: true }),
        Animated.timing(timerPulse, { toValue: 1,    duration: 280, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [timeLeft <= 8]);

  // Gold-glow pulse loop while gold rush is active
  useEffect(() => {
    if (!goldRush) { rushPulse.setValue(0); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(rushPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(rushPulse, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [goldRush]);

  // ── Ad hooks ──────────────────────────────────────────────────────────────
  const { loaded: undoAdReady, showAd: showUndoAd } = useRewardedAd(
    useCallback(() => { executeUndo(); }, [])
  );
  const { loaded: bombAdReady, showAd: showBombAd } = useRewardedAd(
    useCallback(() => { setBombReady(true); setBombMode(true); }, [])
  );

  // ── Timer helpers ─────────────────────────────────────────────────────────

  function addTime(seconds) {
    if (seconds <= 0) return;
    timeRef.current = Math.min(TIMER_MAX, timeRef.current + seconds);
    setTimeLeft(Math.ceil(timeRef.current));
    setTimeGain(`+${seconds % 1 === 0 ? seconds : seconds.toFixed(1)}s`);
    gainAnim.setValue(0);
    Animated.timing(gainAnim, { toValue: 1, duration: 800, useNativeDriver: true })
      .start(() => setTimeGain(null));
  }

  // ── FX helpers ────────────────────────────────────────────────────────────

  function addFloat(col, landIdx, text, color) {
    const id = fxId.current++;
    const x = col * TILE_SIZE;
    const y = INDICATOR_H + (GRID_ROWS - 1 - landIdx) * TILE_SIZE - 8;
    setFloats(f => [...f, { id, x, y, text, color }]);
    setTimeout(() => setFloats(f => f.filter(e => e.id !== id)), 800);
  }

  function addBurst(col, landIdx, color) {
    const id = fxId.current++;
    const x = col * TILE_SIZE + TILE_SIZE / 2;
    const y = INDICATOR_H + (GRID_ROWS - 1 - landIdx) * TILE_SIZE + TILE_SIZE / 2;
    setBursts(b => [...b, { id, x, y, color }]);
    setTimeout(() => setBursts(b => b.filter(e => e.id !== id)), 600);
  }

  function shake(strength = 6) {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1,    duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1,   duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0.6,  duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -0.6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,    duration: 40, useNativeDriver: true }),
    ]).start();
  }

  function popCombo() {
    comboAnim.setValue(0.4);
    Animated.spring(comboAnim, { toValue: 1, speed: 30, bounciness: 16, useNativeDriver: true }).start();
  }

  // ── Core drop logic ───────────────────────────────────────────────────────

  function handleColumnPress(col) {
    if (gameEnded) return;

    if (bombMode) {
      const { newGrid, removedId } = bombColumn(gridRef.current, col);
      if (removedId) delete animRefs.current[removedId];
      gridRef.current = newGrid;
      setGrid(newGrid);
      setBombMode(false);
      setBombReady(false);
      haptic('light');
      return;
    }

    if (!canDropInCol(gridRef.current, col)) return;

    // Snapshot for undo
    prevGrid.current    = gridRef.current.map(c => [...c]);
    prevScore.current   = scoreRef.current;
    prevCurrent.current = currentTile;

    // Wildcard: adopt the value of the top tile so the merge loop fuses them
    const isWild = !!currentTile.wild;
    const colStack = gridRef.current[col];
    const effValue = isWild
      ? (colStack.length ? colStack[colStack.length - 1].value : 2)
      : currentTile.value;

    const result = dropTile(gridRef.current, col, effValue, currentTile.id);
    if (!result) return;
    const { newGrid, mergedScore, mergedTileId, consumedIds, specialTile } = result;

    for (const id of consumedIds) delete animRefs.current[id];

    // Column press feedback
    const pressAnim = colPressAnims.current[col];
    Animated.sequence([
      Animated.timing(pressAnim, { toValue: 0.88, duration: 60, useNativeDriver: true }),
      Animated.spring(pressAnim, { toValue: 1, speed: 50, useNativeDriver: true }),
    ]).start();

    // ── Combo + multipliers ──────────────────────────────────────────────
    const didMerge = mergedScore > 0;
    const newCombo = didMerge ? combo + 1 : 0;
    const comboMult = didMerge ? Math.min(newCombo, MAX_COMBO_MULT) : 1;
    const rushMult  = goldRush ? RUSH_MULT : 1;
    const chainLen  = consumedIds.length;

    let gained = mergedScore * comboMult * rushMult;

    setCombo(newCombo);
    if (newCombo >= 2) popCombo();

    // ── Gold Rush meter ──────────────────────────────────────────────────
    let rushTriggered = false;
    if (!goldRush && didMerge) {
      const fill = chainLen * 16 + 6;
      meterRef.current = Math.min(METER_MAX, meterRef.current + fill);
      if (meterRef.current >= METER_MAX) {
        rushTriggered = true;
        meterRef.current = 0;
      }
      setMeter(meterRef.current);
    }

    // Merges buy back time — the survival loop
    if (didMerge) addTime(timeReward(chainLen, !!specialTile));

    // ── FX ───────────────────────────────────────────────────────────────
    const landIdx = newGrid[col].length - 1;
    if (didMerge) {
      const mergedVal = newGrid[col][landIdx]?.value ?? effValue * 2;
      const glow = (palette[mergedVal] ?? palette[2048]).glow;
      addBurst(col, landIdx, glow);
      const label = comboMult > 1 ? `+${gained.toLocaleString()} ×${comboMult}` : `+${gained.toLocaleString()}`;
      addFloat(col, landIdx, label, goldRush ? '#ffd700' : comboColor(newCombo));
      haptic(chainLen >= 2 ? 'medium' : 'light');
      if (chainLen >= 2) shake();
    } else {
      haptic('light');
    }

    // Merge pulse on surviving tile
    if (didMerge && mergedTileId && animRefs.current[mergedTileId]) {
      Animated.sequence([
        Animated.timing(animRefs.current[mergedTileId], { toValue: 1.35, duration: 80, useNativeDriver: true }),
        Animated.spring(animRefs.current[mergedTileId], { toValue: 1, speed: 40, bounciness: 14, useNativeDriver: true }),
      ]).start();
    }

    // 2048 formation: bonus + tile clears with a flourish
    let finalGrid = newGrid;
    if (specialTile) {
      gained += 4096 * rushMult;
      haptic('success');
      shake();
      const anim = animRefs.current[specialTile.id];
      if (anim) {
        Animated.sequence([
          Animated.timing(anim, { toValue: 1.6, duration: 150, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0,   duration: 250, useNativeDriver: true }),
        ]).start(() => {
          delete animRefs.current[specialTile.id];
          const clearedGrid = gridRef.current.map((c, i) =>
            i === specialTile.col ? c.filter(t => t.id !== specialTile.id) : c
          );
          gridRef.current = clearedGrid;
          setGrid(clearedGrid);
        });
      }
    }

    // ── Advance the tile queue ───────────────────────────────────────────
    // During gold rush the normal queue is frozen: current is replaced by
    // wildcards until they run out, then the frozen nextTile resumes.
    let newCurrent, newNext = nextTile;

    if (isWild) wildLeftRef.current -= 1;

    if (rushTriggered) {
      setGoldRush(true);
      wildLeftRef.current = WILD_COUNT;
      haptic('success');
      shake();
      newCurrent = makeWildTile(`t${tileCounter.current++}`);
      animRefs.current[newCurrent.id] = new Animated.Value(1);
    } else if (wildLeftRef.current > 0) {
      newCurrent = makeWildTile(`t${tileCounter.current++}`);
      animRefs.current[newCurrent.id] = new Animated.Value(1);
    } else {
      if (goldRush) setGoldRush(false); // last wildcard spent
      newCurrent = nextTile;
      const newId = `t${tileCounter.current++}`;
      animRefs.current[newId] = new Animated.Value(1);
      newNext = makeTile(newId, getRandomTileValue());
    }
    setWildLeft(wildLeftRef.current);

    const newScore = scoreRef.current + gained;
    gridRef.current  = finalGrid;
    scoreRef.current = newScore;
    setGrid(finalGrid);
    setScore(newScore);
    setCurrentTile(newCurrent);
    setNextTile(newNext);

    if (isGameOver(finalGrid) && !specialTile) {
      triggerGameOver(finalGrid, newScore);
    }
  }

  function triggerGameOver(finalGrid, finalScore, reason = 'board') {
    if (endedRef.current) return;
    endedRef.current = true;
    setGameEnded(true);
    haptic('error');
    const bestTileValue = getMaxTile(finalGrid);
    setTimeout(() => {
      navigation.replace('GameOver', {
        score: finalScore,
        bestTileValue,
        savedGrid: finalGrid,
        savedScore: finalScore,
        reason,
      });
    }, 600);
  }

  // ── Undo ──────────────────────────────────────────────────────────────────

  function handleUndo() {
    if (!prevGrid.current) return;
    if (undosLeft > 0) {
      executeUndo();
      setUndosLeft(u => u - 1);
    } else if (undoAdReady) {
      showUndoAd();
    }
  }

  function executeUndo() {
    if (!prevGrid.current) return;
    for (const col of prevGrid.current) {
      for (const tile of col) {
        if (!animRefs.current[tile.id]) animRefs.current[tile.id] = new Animated.Value(1);
      }
    }
    gridRef.current  = prevGrid.current;
    scoreRef.current = prevScore.current;
    setGrid(prevGrid.current);
    setScore(prevScore.current);
    setShownScore(prevScore.current);
    setCurrentTile(prevCurrent.current);
    setCombo(0);
    prevGrid.current = null;
    prevScore.current = null;
    prevCurrent.current = null;
    haptic('light');
  }

  // ── Bomb ──────────────────────────────────────────────────────────────────

  function handleBombPress() {
    if (gameEnded) return;
    if (bombReady) setBombMode(m => !m);
    else if (bombAdReady) showBombAd();
  }

  // ── Haptics ───────────────────────────────────────────────────────────────

  function haptic(type) {
    if (Platform.OS === 'web') return;
    switch (type) {
      case 'light':   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);   break;
      case 'medium':  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);  break;
      case 'success': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); break;
      case 'error':   Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);   break;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const ts = TILE_SIZE;
  const fullCols = grid.filter(c => c.length >= GRID_ROWS).length;
  const danger = !goldRush && (fullCols >= 3 || timeLeft <= 8);
  const timerColor = timeLeft > 15 ? '#22d3ee' : timeLeft > 8 ? '#ff7700' : '#ff1744';

  const gridBorderColor = goldRush ? '#FBBF24' : danger ? '#ff1744' : 'rgba(255,255,255,0.08)';
  const bgColors = goldRush
    ? ['#181000', '#221a00', '#100a00']
    : ['#020209', '#06030f', '#020914'];

  const shakeX = shakeAnim.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] });
  const rushGlowOpacity = rushPulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.5] });

  const undoDisabled = !prevGrid.current && !undoAdReady;
  const bombDisabled = !bombReady && !bombAdReady;

  return (
    <LinearGradient colors={bgColors} style={styles.fill}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe} edges={['top']}>

        {/* HUD */}
        <View style={styles.hud}>
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>SCORE</Text>
            <Text style={[
              styles.hudScore,
              goldRush && {
                color: '#FBBF24',
                textShadowColor: 'rgba(251,191,36,0.8)',
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 10,
              },
            ]}>
              {shownScore.toLocaleString()}
            </Text>
          </View>

          <View style={styles.hudCenter}>
            {goldRush
              ? <Text style={styles.rushTitle}>⚡ GOLD RUSH</Text>
              : danger
                ? <Text style={styles.dangerTitle}>⚠ DANGER</Text>
                : <Text style={styles.gameTitle}>DROP MERGE</Text>}
            <Animated.Text
              style={[
                styles.timerText,
                { color: timerColor, transform: [{ scale: timerPulse }] },
                timeLeft <= 8 && {
                  textShadowColor: 'rgba(255,23,68,0.8)',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 12,
                },
              ]}
            >
              {timeLeft}
            </Animated.Text>
            <View style={styles.timerTrack}>
              <View
                style={[
                  styles.timerFill,
                  {
                    width: `${(timeRef.current / TIMER_MAX) * 100}%`,
                    backgroundColor: timerColor,
                    shadowColor: timerColor,
                    shadowOpacity: 0.8,
                    shadowRadius: 4,
                  },
                ]}
              />
            </View>
            {timeGain && (
              <Animated.Text
                style={[
                  styles.timeGainText,
                  {
                    opacity: gainAnim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
                    transform: [{
                      translateY: gainAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }),
                    }],
                  },
                ]}
              >
                ⏱ {timeGain}
              </Animated.Text>
            )}
          </View>

          <GradBorderBtn
            gradientColors={['#8B5CF6', '#6D28D9']}
            onPress={handleUndo}
            disabled={undoDisabled}
          >
            <Text style={styles.undoBtnIcon}>↩</Text>
            <Text style={styles.undoBtnLabel}>{undosLeft > 0 ? `×${undosLeft}` : '📺'}</Text>
          </GradBorderBtn>
        </View>

        {/* Gold Rush meter */}
        <View style={styles.meterRow}>
          <Text style={styles.meterIcon}>{goldRush ? '⚡' : '🔥'}</Text>
          <View style={styles.meterTrack}>
            {goldRush ? (
              <LinearGradient
                colors={['#FBBF24', '#F59E0B']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.meterFill, { width: `${(wildLeft / WILD_COUNT) * 100}%` }]}
              />
            ) : (
              <LinearGradient
                colors={['#ff4500', '#ff7700', '#FBBF24']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.meterFill, { width: `${meter}%` }]}
              />
            )}
          </View>
          <Text style={[styles.meterLabel, goldRush && { color: '#FBBF24' }]}>
            {goldRush ? `${wildLeft} WILD` : 'GOLD RUSH'}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <View style={styles.tilePreview}>
            <Text style={styles.previewLabel}>NEXT</Text>
            <TileCell tile={nextTile} animValue={animRefs.current[nextTile.id]} size={ts * 0.7} palette={palette} design={tileDesign} />
          </View>

          <View style={styles.tilePreview}>
            <Text style={styles.previewLabel}>NOW</Text>
            <TileCell tile={currentTile} animValue={animRefs.current[currentTile.id]} size={ts * 0.85} palette={palette} design={tileDesign} />
          </View>

          <GradBorderBtn
            gradientColors={bombMode ? ['#ff3300', '#ff6600'] : ['#e879f9', '#8B5CF6']}
            onPress={handleBombPress}
            disabled={bombDisabled}
            style={bombMode && styles.bombBtnActive}
          >
            <Text style={styles.bombIcon}>💣</Text>
            <Text style={styles.bombLabel}>{bombReady ? (bombMode ? 'PICK' : 'USE') : '📺'}</Text>
          </GradBorderBtn>
        </View>

        {/* Grid */}
        <View style={styles.gridWrapper}>
          <Animated.View
            style={[
              styles.gridFrame,
              { borderColor: gridBorderColor, transform: [{ translateX: shakeX }] },
            ]}
          >
            {goldRush && (
              <Animated.View
                style={[styles.rushGlow, { opacity: rushGlowOpacity }]}
                pointerEvents="none"
              />
            )}

            <View style={[styles.grid, { width: ts * GRID_COLS }]}>
              {Array.from({ length: GRID_COLS }, (_, col) => {
                const full = !canDropInCol(grid, col);
                const pressScale = colPressAnims.current[col];
                return (
                  <Animated.View key={col} style={{ transform: [{ scale: pressScale }] }}>
                    <TouchableOpacity
                      onPress={() => handleColumnPress(col)}
                      activeOpacity={0.75}
                      disabled={gameEnded}
                    >
                      <View style={[styles.dropIndicator, { width: ts }]}>
                        {full
                          ? <Text style={styles.fullMark}>✕</Text>
                          : bombMode
                            ? <Text style={styles.bombDropIcon}>💣</Text>
                            : <Text style={[styles.dropArrow, goldRush && { color: '#FBBF24' }]}>▼</Text>}
                      </View>

                      {Array.from({ length: GRID_ROWS }, (_, r) => {
                        const tile = grid[col][GRID_ROWS - 1 - r] ?? null;
                        return (
                          <TileCell
                            key={r}
                            tile={tile}
                            animValue={tile ? animRefs.current[tile.id] : null}
                            size={ts}
                            palette={palette}
                            design={tileDesign}
                          />
                        );
                      })}
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}

              {/* FX overlays */}
              {floats.map(f => <FloatLabel key={f.id} {...f} />)}
              {bursts.map(b => <Burst key={b.id} {...b} fx={mergeFx} />)}

              {/* Combo badge */}
              {combo >= 2 && (
                <Animated.View
                  style={[styles.comboBadge, { transform: [{ scale: comboAnim }] }]}
                  pointerEvents="none"
                >
                  <LinearGradient
                    colors={[comboColor(combo) + '33', comboColor(combo) + '11']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.comboBadgeGrad}
                  >
                    <Text style={[styles.comboText, {
                      color: comboColor(combo),
                      textShadowColor: comboColor(combo),
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: 8,
                    }]}>
                      COMBO ×{Math.min(combo, MAX_COMBO_MULT)}
                    </Text>
                  </LinearGradient>
                </Animated.View>
              )}
            </View>
          </Animated.View>
        </View>

        {/* Hint */}
        <View style={styles.hint}>
          {bombMode
            ? <Text style={[styles.hintText, { color: '#ff3300' }]}>Tap a column to remove its top tile</Text>
            : goldRush
              ? <Text style={[styles.hintText, { color: '#FBBF24' }]}>⚡ Wildcards merge with ANY tile — scores ×{RUSH_MULT}!</Text>
              : <Text style={styles.hintText}>Chain merges to fill the Gold Rush meter</Text>}
        </View>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  safe: { flex: 1 },

  hud: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  hudItem: { alignItems: 'flex-start', minWidth: 90 },
  hudLabel: { color: '#64748B', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  hudScore: { color: '#fff', fontSize: 26, fontWeight: '900', fontVariant: ['tabular-nums'] },
  hudCenter: { flex: 1, alignItems: 'center' },
  gameTitle: { color: '#8B5CF6', fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  rushTitle: { color: '#FBBF24', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  dangerTitle: { color: '#ff1744', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  timerText: { fontSize: 32, fontWeight: '900', fontVariant: ['tabular-nums'], lineHeight: 36 },
  timerTrack: {
    width: 90, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginTop: 3,
  },
  timerFill: { height: 6, borderRadius: 3 },
  timeGainText: {
    position: 'absolute', top: 10, right: -14,
    color: '#00ff88', fontSize: 13, fontWeight: '900',
  },

  // Gradient border control buttons
  gradBtnOuter: { borderRadius: 10, padding: 1.5 },
  gradBtnInner: {
    backgroundColor: '#07021a',
    borderRadius: 9,
    paddingHorizontal: 10, paddingVertical: 5,
    alignItems: 'center', justifyContent: 'center',
    minWidth: 50,
  },
  undoBtnIcon: { color: '#fff', fontSize: 20 },
  undoBtnLabel: { color: '#aaa', fontSize: 11, fontWeight: '700' },

  meterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4,
  },
  meterIcon: { fontSize: 14 },
  meterTrack: {
    flex: 1, height: 10, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden',
  },
  meterFill: { height: 10, borderRadius: 5 },
  meterLabel: { color: '#64748B', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, minWidth: 70, textAlign: 'right' },

  controls: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  tilePreview: { alignItems: 'center', gap: 4 },
  previewLabel: { color: '#64748B', fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  bombBtnActive: { opacity: 1 },
  bombIcon: { fontSize: 24 },
  bombLabel: { color: '#aaa', fontSize: 10, fontWeight: '700', marginTop: 2 },
  btnDisabled: { opacity: 0.3 },

  gridWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gridFrame: {
    borderWidth: 1.5, borderRadius: 10, padding: 3,
  },
  rushGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10, backgroundColor: '#FBBF24',
  },
  grid: { flexDirection: 'row' },

  dropIndicator: { height: INDICATOR_H, alignItems: 'center', justifyContent: 'center' },
  dropArrow: { color: '#8B5CF6', fontSize: 12 },
  bombDropIcon: { fontSize: 14 },
  fullMark: { color: '#ff1744', fontSize: 12, fontWeight: '900' },

  cell: {
    alignItems: 'center', justifyContent: 'center',
    margin: 1, backgroundColor: '#0a0a16',
  },
  tileText: { fontWeight: '900', fontVariant: ['tabular-nums'] },
  cellOrnament: { position: 'absolute', bottom: 1, right: 3, opacity: 0.85 },
  cellEmblem: { position: 'absolute', top: -2, left: 0 },

  wildCell: {
    backgroundColor: '#2a1f00',
    borderColor: '#FBBF24', borderWidth: 2,
    shadowColor: '#FBBF24', shadowOpacity: 0.9, shadowRadius: 6, elevation: 6,
  },
  wildStar: { color: '#FBBF24', fontWeight: '900' },

  floatLabel: {
    position: 'absolute', fontSize: 17, fontWeight: '900',
    textShadowColor: '#000', textShadowRadius: 4,
  },

  burstWrap: { position: 'absolute', width: 1, height: 1 },
  burstDot: {
    position: 'absolute', width: 6, height: 6, borderRadius: 3,
    marginLeft: -3, marginTop: -3,
  },
  burstEmoji: {
    position: 'absolute', fontSize: 13, marginLeft: -7, marginTop: -8,
  },

  comboBadge: {
    position: 'absolute', top: -2, alignSelf: 'center',
    borderRadius: 50, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  comboBadgeGrad: {
    paddingHorizontal: 18, paddingVertical: 7,
    alignItems: 'center', borderRadius: 50,
  },
  comboText: { fontSize: 16, fontWeight: '900', letterSpacing: 1.5 },

  hint: { alignItems: 'center', paddingVertical: 8 },
  hintText: { color: '#333', fontSize: 12 },
});
