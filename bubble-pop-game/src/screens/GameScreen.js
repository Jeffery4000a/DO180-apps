import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Platform, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import useRewardedAd from '../components/useRewardedAd';
import {
  GRID_COLS, GRID_ROWS, TILE_SIZE, TILES,
  createEmptyGrid, canDropInCol, isGameOver, getMaxTile,
  dropTile, bombColumn, applyContinue,
  getRandomTileValue, tileFontSize,
} from '../utils/gameLogic';

// ─── Tile Cell ────────────────────────────────────────────────────────────────

function TileCell({ tile, animValue, size }) {
  const style = tile ? TILES[tile.value] ?? TILES[2048] : null;
  const fontSize = tile ? tileFontSize(tile.value) : 14;

  return (
    <Animated.View
      style={[
        styles.cell,
        { width: size, height: size, borderRadius: 6 },
        style && {
          backgroundColor: style.bg,
          borderColor: style.glow,
          borderWidth: 1.5,
          shadowColor: style.glow,
          shadowOpacity: 0.6,
          shadowRadius: 4,
          elevation: 4,
        },
        animValue && { transform: [{ scale: animValue }] },
      ]}
    >
      {tile && (
        <Text style={[styles.tileText, { fontSize, color: style.textColor }]}>
          {tile.value}
        </Text>
      )}
    </Animated.View>
  );
}

// ─── Helper to make a tile object ─────────────────────────────────────────────

function makeTile(id, value) {
  return { id, value };
}

// ─── Game Screen ──────────────────────────────────────────────────────────────

export default function GameScreen({ route, navigation }) {
  const continueMode = route.params?.continueMode ?? false;
  const savedGrid    = route.params?.savedGrid    ?? null;
  const savedScore   = route.params?.savedScore   ?? 0;

  // ── State (plain, serializable) ──────────────────────────────────────────
  const initGrid = useCallback(() => {
    if (continueMode && savedGrid) return applyContinue(savedGrid);
    return createEmptyGrid();
  }, []);

  const [grid,         setGrid]         = useState(initGrid);
  const [score,        setScore]        = useState(continueMode ? savedScore : 0);
  const [currentTile,  setCurrentTile]  = useState(() => makeTile('t0', getRandomTileValue()));
  const [nextTile,     setNextTile]     = useState(() => makeTile('t1', getRandomTileValue()));
  const [undosLeft,    setUndosLeft]    = useState(3);
  const [bombReady,    setBombReady]    = useState(false);
  const [bombMode,     setBombMode]     = useState(false);
  const [isAnimating,  setIsAnimating]  = useState(false);
  const [gameEnded,    setGameEnded]    = useState(false);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const gridRef        = useRef(grid);
  const scoreRef       = useRef(continueMode ? savedScore : 0);
  const tileCounter    = useRef(2);  // t0 and t1 used above
  const prevGrid       = useRef(null);
  const prevScore      = useRef(null);
  const prevCurrent    = useRef(null);

  // animRefs: { [tileId]: Animated.Value } — kept OUT of React state
  const animRefs = useRef({});

  const colPressAnims = useRef(
    Array.from({ length: GRID_COLS }, () => new Animated.Value(1))
  );

  // ── Initialize animRefs ───────────────────────────────────────────────────
  useEffect(() => {
    // Tiles already in grid (continue mode)
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
    // Current and next tile
    animRefs.current['t0'] = new Animated.Value(1);
    animRefs.current['t1'] = new Animated.Value(1);
  }, []);

  // ── Ad hooks (3 separate instances) ──────────────────────────────────────

  const { loaded: undoAdReady, showAd: showUndoAd } = useRewardedAd(
    useCallback(() => { executeUndo(/* viaaAd= */ true); }, [])
  );

  const { loaded: bombAdReady, showAd: showBombAd } = useRewardedAd(
    useCallback(() => { setBombReady(true); setBombMode(true); }, [])
  );

  // (continue ad lives in GameOverScreen)

  // ── Core drop logic ───────────────────────────────────────────────────────

  function handleColumnPress(col) {
    if (isAnimating || gameEnded) return;

    // Bomb mode: destroy top tile of this column
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

    // Drop & merge
    const result = dropTile(gridRef.current, col, currentTile.value, currentTile.id);
    if (!result) return;

    const { newGrid, mergedScore, mergedTileId, consumedIds, specialTile } = result;

    // Clean up animRefs for absorbed tiles
    for (const id of consumedIds) delete animRefs.current[id];

    // Animate column press indicator
    const pressAnim = colPressAnims.current[col];
    Animated.sequence([
      Animated.timing(pressAnim, { toValue: 0.88, duration: 60, useNativeDriver: true }),
      Animated.spring(pressAnim,  { toValue: 1,    speed: 50,  useNativeDriver: true }),
    ]).start();

    // Animate merged tile (scale pulse)
    if (mergedScore > 0 && mergedTileId && animRefs.current[mergedTileId]) {
      setIsAnimating(true);
      haptic('medium');
      Animated.sequence([
        Animated.timing(animRefs.current[mergedTileId], { toValue: 1.35, duration: 80, useNativeDriver: true }),
        Animated.spring(animRefs.current[mergedTileId],  { toValue: 1,    speed: 40, bounciness: 14, useNativeDriver: true }),
      ]).start(() => setIsAnimating(false));
    } else {
      haptic('light');
    }

    // Handle 2048 formation: extra animation + bonus points + removal
    let bonusScore = 0;
    let finalGrid  = newGrid;
    if (specialTile) {
      bonusScore = 4096;
      haptic('success');
      const anim = animRefs.current[specialTile.id];
      if (anim) {
        setIsAnimating(true);
        Animated.sequence([
          Animated.timing(anim, { toValue: 1.6,  duration: 150, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0,    duration: 250, useNativeDriver: true }),
        ]).start(() => {
          delete animRefs.current[specialTile.id];
          const clearedGrid = finalGrid.map((c, i) =>
            i === specialTile.col ? c.filter(t => t.id !== specialTile.id) : c
          );
          gridRef.current = clearedGrid;
          setGrid(clearedGrid);
          setIsAnimating(false);
        });
      }
    }

    // Advance tile queue
    const newId = `t${tileCounter.current++}`;
    animRefs.current[newId] = new Animated.Value(1);
    const newNext = makeTile(newId, getRandomTileValue());

    const newScore = scoreRef.current + mergedScore + bonusScore;
    gridRef.current = finalGrid;
    scoreRef.current = newScore;
    setGrid(finalGrid);
    setScore(newScore);
    setCurrentTile(nextTile);
    setNextTile(newNext);

    // Check game over (after 2048 removal, give one extra frame)
    if (isGameOver(finalGrid) && !specialTile) {
      triggerGameOver(finalGrid, newScore);
    }
  }

  function triggerGameOver(finalGrid, finalScore) {
    setGameEnded(true);
    haptic('error');
    const bestTileValue = getMaxTile(finalGrid);
    setTimeout(() => {
      navigation.replace('GameOver', {
        score:         finalScore,
        bestTileValue,
        savedGrid:     finalGrid,   // plain objects — serializable
        savedScore:    finalScore,
      });
    }, 600);
  }

  // ── Undo ──────────────────────────────────────────────────────────────────

  function handleUndo() {
    if (undosLeft > 0) {
      executeUndo(false);
      setUndosLeft(u => u - 1);
    } else if (undoAdReady) {
      showUndoAd();
    }
  }

  function executeUndo(viaAd = false) {
    if (!prevGrid.current) return;
    // Restore animRefs for any tiles that were in prevGrid but not current grid
    for (const col of prevGrid.current) {
      for (const tile of col) {
        if (!animRefs.current[tile.id]) {
          animRefs.current[tile.id] = new Animated.Value(1);
        }
      }
    }
    gridRef.current  = prevGrid.current;
    scoreRef.current = prevScore.current;
    setGrid(prevGrid.current);
    setScore(prevScore.current);
    setCurrentTile(prevCurrent.current);
    prevGrid.current    = null;
    prevScore.current   = null;
    prevCurrent.current = null;
    haptic('light');
  }

  // ── Bomb ──────────────────────────────────────────────────────────────────

  function handleBombPress() {
    if (bombReady) {
      setBombMode(m => !m);
    } else if (bombAdReady) {
      showBombAd();
    }
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

  // ── Rendering ─────────────────────────────────────────────────────────────

  const ts = TILE_SIZE;

  return (
    <LinearGradient colors={['#060610', '#0a0a1a', '#080812']} style={styles.fill}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe} edges={['top']}>

        {/* HUD */}
        <View style={styles.hud}>
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>SCORE</Text>
            <Text style={styles.hudScore}>{score.toLocaleString()}</Text>
          </View>

          <View style={styles.hudCenter}>
            <Text style={styles.gameTitle}>DROP MERGE</Text>
          </View>

          {/* Undo button */}
          <TouchableOpacity
            style={[styles.undoBtn, (!undosLeft && !undoAdReady) && styles.btnDisabled]}
            onPress={handleUndo}
            disabled={!prevGrid.current && !undoAdReady}
          >
            <Text style={styles.undoBtnIcon}>↩</Text>
            <Text style={styles.undoBtnLabel}>
              {undosLeft > 0 ? `×${undosLeft}` : '📺'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Controls: next tile + bomb */}
        <View style={styles.controls}>
          <View style={styles.nextTileBox}>
            <Text style={styles.nextLabel}>NEXT</Text>
            <TileCell
              tile={nextTile}
              animValue={animRefs.current[nextTile.id]}
              size={ts * 0.7}
            />
          </View>

          <View style={styles.currentTileBox}>
            <Text style={styles.nextLabel}>NOW</Text>
            <TileCell
              tile={currentTile}
              animValue={animRefs.current[currentTile.id]}
              size={ts * 0.8}
            />
          </View>

          {/* Bomb power-up */}
          <TouchableOpacity
            style={[
              styles.bombBtn,
              bombMode && styles.bombBtnActive,
              (!bombReady && !bombAdReady) && styles.btnDisabled,
            ]}
            onPress={handleBombPress}
          >
            <Text style={styles.bombIcon}>💣</Text>
            <Text style={styles.bombLabel}>{bombReady ? (bombMode ? 'PICK' : 'USE') : '📺'}</Text>
          </TouchableOpacity>
        </View>

        {/* Grid */}
        <View style={styles.gridWrapper}>
          <View style={[styles.grid, { width: ts * GRID_COLS }]}>
            {Array.from({ length: GRID_COLS }, (_, col) => {
              const full = !canDropInCol(grid, col);
              const pressScale = colPressAnims.current[col];
              return (
                <Animated.View
                  key={col}
                  style={[styles.column, { transform: [{ scale: pressScale }] }]}
                >
                  <TouchableOpacity
                    style={styles.columnTouchable}
                    onPress={() => handleColumnPress(col)}
                    activeOpacity={0.75}
                    disabled={gameEnded}
                  >
                    {/* Drop indicator at top */}
                    <View style={[styles.dropIndicator, { width: ts }]}>
                      {!full && !bombMode && (
                        <Text style={styles.dropArrow}>▼</Text>
                      )}
                      {bombMode && !full && (
                        <Text style={styles.bombDropIcon}>💣</Text>
                      )}
                      {full && (
                        <Text style={styles.fullMark}>✕</Text>
                      )}
                    </View>

                    {/* Tile cells (rendered top → bottom)
                        grid[col][0]      = bottom tile (shows at screen row GRID_ROWS-1)
                        grid[col][last]   = top tile    (shows at screen row GRID_ROWS-len)
                        tile at screen row r = grid[col][GRID_ROWS - 1 - r]          */}
                    {Array.from({ length: GRID_ROWS }, (_, r) => {
                      const tile = grid[col][GRID_ROWS - 1 - r] ?? null;
                      return (
                        <TileCell
                          key={r}
                          tile={tile}
                          animValue={tile ? animRefs.current[tile.id] : null}
                          size={ts}
                        />
                      );
                    })}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Hint */}
        <View style={styles.hint}>
          {bombMode
            ? <Text style={[styles.hintText, { color: '#ff3300' }]}>Tap a column to remove its top tile</Text>
            : <Text style={styles.hintText}>Tap a column · Match tiles to merge · Reach 2048</Text>
          }
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
    borderBottomWidth: 1, borderBottomColor: '#ffffff12',
  },
  hudItem: { alignItems: 'flex-start', minWidth: 90 },
  hudLabel: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  hudScore: { color: '#fff', fontSize: 22, fontWeight: '900' },
  hudCenter: { flex: 1, alignItems: 'center' },
  gameTitle: { color: '#7c4dff', fontSize: 13, fontWeight: '900', letterSpacing: 3 },

  undoBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ffffff12', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6, minWidth: 54,
  },
  undoBtnIcon: { color: '#fff', fontSize: 20 },
  undoBtnLabel: { color: '#aaa', fontSize: 11, fontWeight: '700' },

  controls: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  nextTileBox: { alignItems: 'center', gap: 4 },
  currentTileBox: { alignItems: 'center', gap: 4 },
  nextLabel: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  bombBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ffffff0a', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8, minWidth: 58,
    borderWidth: 1, borderColor: '#ffffff15',
  },
  bombBtnActive: {
    backgroundColor: '#ff330020', borderColor: '#ff3300',
  },
  bombIcon: { fontSize: 24 },
  bombLabel: { color: '#aaa', fontSize: 10, fontWeight: '700', marginTop: 2 },

  btnDisabled: { opacity: 0.3 },

  gridWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row' },
  column: {},
  columnTouchable: {},

  dropIndicator: {
    height: 22, alignItems: 'center', justifyContent: 'center',
  },
  dropArrow: { color: '#7c4dff', fontSize: 12 },
  bombDropIcon: { fontSize: 14 },
  fullMark: { color: '#ff1744', fontSize: 12, fontWeight: '900' },

  cell: {
    alignItems: 'center', justifyContent: 'center',
    margin: 1, backgroundColor: '#0a0a16',
  },
  tileText: {
    fontWeight: '900', fontVariant: ['tabular-nums'],
  },

  hint: { alignItems: 'center', paddingVertical: 8 },
  hintText: { color: '#333', fontSize: 12 },
});
