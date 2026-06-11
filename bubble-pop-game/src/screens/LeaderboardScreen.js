import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLeaderboard, getPlayerName, setPlayerName, flagEmoji } from '../utils/leaderboard';

const TABS = [
  { key: 'global',  label: '🌍 Global'  },
  { key: 'region',  label: '🗺 Region'  },
  { key: 'country', label: '🚩 Country' },
];

const PODIUM_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32']; // gold, silver, bronze

// ── Floating crown on #1 ─────────────────────────────────────────────────────
function Crown() {
  const float = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  return (
    <Animated.Text style={[styles.crown, { transform: [{ translateY }] }]}>👑</Animated.Text>
  );
}

// ── Podium pedestal ──────────────────────────────────────────────────────────
function Pedestal({ entry, place, delay }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 6 }),
    ]).start();
  }, [entry?.name]);

  if (!entry) return <View style={styles.pedestalSlot} />;

  const heights = { 1: 96, 2: 72, 3: 56 };
  const color = PODIUM_COLORS[place - 1];

  return (
    <Animated.View style={[styles.pedestalSlot, { opacity: anim, transform: [{ scale: anim }] }]}>
      {place === 1 && <Crown />}
      <Text style={styles.pedestalFlag}>{flagEmoji(entry.country)}</Text>
      <Text style={[styles.pedestalName, entry.you && { color: '#00d4ff' }]} numberOfLines={1}>
        {entry.name}
      </Text>
      <Text style={[styles.pedestalScore, { color }]}>{entry.score.toLocaleString()}</Text>
      <LinearGradient
        colors={[color + '50', color + '10']}
        style={[styles.pedestalBar, { height: heights[place], borderColor: color + '90' }]}
      >
        <Text style={[styles.pedestalPlace, { color }]}>{place}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

// ── Animated rank row ────────────────────────────────────────────────────────
function RankRow({ entry, rank, delay }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 70, friction: 9 }),
    ]).start();
  }, []);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });

  return (
    <Animated.View
      style={[
        styles.row,
        entry.you && styles.rowYou,
        { opacity: anim, transform: [{ translateX }] },
      ]}
    >
      <Text style={styles.rowRank}>{rank}</Text>
      <Text style={styles.rowFlag}>{flagEmoji(entry.country)}</Text>
      <Text style={[styles.rowName, entry.you && { color: '#00d4ff' }]} numberOfLines={1}>
        {entry.name}{entry.you ? '  · YOU' : ''}
      </Text>
      <Text style={styles.rowScore}>{entry.score.toLocaleString()}</Text>
    </Animated.View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function LeaderboardScreen({ navigation }) {
  const [scope, setScope]       = useState('global');
  const [board, setBoard]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [needName, setNeedName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const load = useCallback(async (s) => {
    setLoading(true);
    const data = await getLeaderboard(s);
    setBoard(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    getPlayerName().then(name => {
      if (!name) setNeedName(true);
      load(scope);
    });
  }, []);

  function switchTab(s) {
    if (s === scope) return;
    setScope(s);
    load(s);
  }

  async function saveName() {
    const clean = nameInput.trim();
    if (clean.length < 2) return;
    await setPlayerName(clean);
    setNeedName(false);
    load(scope);
  }

  const top3 = board?.entries.slice(0, 3) ?? [];
  const rest = board?.entries.slice(3) ?? [];
  const scopeLabel =
    scope === 'country' ? `${flagEmoji(board?.geo?.code)} ${board?.geo?.name ?? ''}` :
    scope === 'region'  ? board?.geo?.region ?? 'Region' : 'Worldwide';

  return (
    <LinearGradient colors={['#060610', '#0d0a1f', '#080814']} style={styles.fill}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🏆 Leaderboard</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Name gate */}
        {needName ? (
          <View style={styles.nameGate}>
            <Text style={styles.nameTitle}>Pick your player name</Text>
            <Text style={styles.nameSub}>This is how you'll appear on the global board.</Text>
            <TextInput
              style={styles.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="e.g. TileSlayer"
              placeholderTextColor="#444"
              maxLength={14}
              autoFocus
            />
            <TouchableOpacity style={styles.nameBtn} onPress={saveName} activeOpacity={0.85}>
              <LinearGradient colors={['#7c4dff', '#00d4ff']} style={styles.nameBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.nameBtnText}>JOIN THE BOARD</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Tabs */}
            <View style={styles.tabs}>
              {TABS.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.tab, scope === t.key && styles.tabActive]}
                  onPress={() => switchTab(t.key)}
                >
                  <Text style={[styles.tabText, scope === t.key && styles.tabTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.scopeLabel}>{scopeLabel}</Text>

            {loading ? (
              <View style={styles.loading}><ActivityIndicator color="#7c4dff" size="large" /></View>
            ) : (
              <ScrollView key={scope} contentContainerStyle={styles.list}>
                {/* Podium: 2nd · 1st · 3rd */}
                {top3.length > 0 && (
                  <View style={styles.podium}>
                    <Pedestal entry={top3[1]} place={2} delay={150} />
                    <Pedestal entry={top3[0]} place={1} delay={0} />
                    <Pedestal entry={top3[2]} place={3} delay={300} />
                  </View>
                )}

                {/* Player rank banner */}
                {board?.playerRank && (
                  <View style={styles.youBanner}>
                    <Text style={styles.youBannerText}>
                      You're ranked <Text style={styles.youBannerRank}>#{board.playerRank}</Text> {scope === 'global' ? 'worldwide' : `in ${scopeLabel}`}
                    </Text>
                  </View>
                )}

                {/* Rows 4+ */}
                {rest.map((e, i) => (
                  <RankRow key={`${e.name}-${i}`} entry={e} rank={i + 4} delay={400 + i * 45} />
                ))}

                {board?.entries.length === 0 && (
                  <Text style={styles.empty}>No scores here yet — be the first!</Text>
                )}
              </ScrollView>
            )}
          </>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#ffffff12',
  },
  backBtn: { padding: 4 },
  backText: { color: '#7c4dff', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },

  tabs: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingTop: 14,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: 12, backgroundColor: '#ffffff08',
    borderWidth: 1, borderColor: '#ffffff10',
  },
  tabActive: { backgroundColor: '#7c4dff25', borderColor: '#7c4dff' },
  tabText: { color: '#777', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#fff' },

  scopeLabel: {
    color: '#555', fontSize: 12, fontWeight: '700', letterSpacing: 1.5,
    textAlign: 'center', paddingVertical: 10,
  },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 30 },

  podium: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    gap: 10, marginBottom: 18, paddingTop: 16,
  },
  pedestalSlot: { flex: 1, alignItems: 'center', maxWidth: 110 },
  crown: { fontSize: 26, marginBottom: 2 },
  pedestalFlag: { fontSize: 22 },
  pedestalName: { color: '#ddd', fontSize: 12, fontWeight: '700', marginTop: 2, maxWidth: 100 },
  pedestalScore: { fontSize: 14, fontWeight: '900', marginBottom: 6 },
  pedestalBar: {
    width: '100%', borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  pedestalPlace: { fontSize: 30, fontWeight: '900' },

  youBanner: {
    backgroundColor: '#00d4ff15', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#00d4ff40', marginBottom: 14,
    alignItems: 'center',
  },
  youBannerText: { color: '#aaa', fontSize: 14 },
  youBannerRank: { color: '#00d4ff', fontWeight: '900', fontSize: 16 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff07', borderRadius: 12,
    paddingVertical: 11, paddingHorizontal: 14, marginBottom: 7,
    borderWidth: 1, borderColor: '#ffffff0a',
  },
  rowYou: { backgroundColor: '#00d4ff12', borderColor: '#00d4ff60' },
  rowRank: { color: '#666', fontSize: 14, fontWeight: '800', width: 34 },
  rowFlag: { fontSize: 18, marginRight: 10 },
  rowName: { color: '#ccc', fontSize: 14, fontWeight: '600', flex: 1 },
  rowScore: { color: '#fff', fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] },

  empty: { color: '#555', textAlign: 'center', marginTop: 30, fontSize: 14 },

  nameGate: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  nameTitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 6 },
  nameSub: { color: '#777', fontSize: 14, marginBottom: 24, textAlign: 'center' },
  nameInput: {
    width: '100%', backgroundColor: '#ffffff0a', borderRadius: 14,
    borderWidth: 1, borderColor: '#7c4dff60',
    color: '#fff', fontSize: 18, fontWeight: '700',
    paddingHorizontal: 18, paddingVertical: 14, textAlign: 'center',
    marginBottom: 18,
  },
  nameBtn: { width: '100%', borderRadius: 50, overflow: 'hidden' },
  nameBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  nameBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
});
