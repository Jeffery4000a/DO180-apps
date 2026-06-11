import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import useRewardedAd from '../components/useRewardedAd';
import {
  CATALOG, RARITY,
  getTokens, addTokens, drawCard,
  getOwned, getEquipped, equip, previewPalette,
} from '../utils/cosmetics';

// Mini 3-tile preview strip for theme cards
function ThemeStrip({ themeId }) {
  const p = previewPalette(themeId);
  return (
    <View style={styles.themeStrip}>
      {[2, 64, 2048].map(v => (
        <View key={v} style={[styles.stripTile, { backgroundColor: p[v].bg, borderColor: p[v].glow }]}>
          <Text style={[styles.stripText, { color: p[v].textColor }]}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

export default function CardVaultScreen({ navigation }) {
  const [tokens, setTokens]     = useState(0);
  const [owned, setOwned]       = useState([]);
  const [equipped, setEquipped] = useState({ theme: '', effect: '' });
  const [revealed, setRevealed] = useState(null);  // item just drawn
  const [drawing, setDrawing]   = useState(false);
  const [message, setMessage]   = useState(null);

  const flipAnim   = useRef(new Animated.Value(0)).current; // 0 = back, 1 = face
  const glowAnim   = useRef(new Animated.Value(0)).current;
  const floatAnim  = useRef(new Animated.Value(0)).current;
  const tokenPulse = useRef(new Animated.Value(1)).current;

  const refresh = useCallback(async () => {
    const [t, o, e] = await Promise.all([getTokens(), getOwned(), getEquipped()]);
    setTokens(t); setOwned(o); setEquipped(e);
  }, []);

  useEffect(() => { refresh(); }, []);

  // Idle float on the face-down deck
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Rewarded ad → +1 token. This is the revenue stream of the vault.
  const { loaded: adReady, showAd } = useRewardedAd(
    useCallback(() => {
      addTokens(1).then(t => {
        setTokens(t);
        Animated.sequence([
          Animated.spring(tokenPulse, { toValue: 1.4, speed: 30, useNativeDriver: true }),
          Animated.spring(tokenPulse, { toValue: 1, speed: 30, useNativeDriver: true }),
        ]).start();
      });
    }, [])
  );

  async function handleDraw() {
    if (drawing) return;
    setMessage(null);
    const result = await drawCard();
    if (result.error === 'no_tokens') {
      setMessage('No tokens — play daily or watch an ad to earn one!');
      return;
    }
    if (result.complete) {
      setMessage('🎊 Collection complete — you own everything!');
      return;
    }

    setDrawing(true);
    setRevealed(null);
    flipAnim.setValue(0);
    glowAnim.setValue(0);

    // Flip to 90° (edge-on), swap to the card face, flip back out
    Animated.timing(flipAnim, { toValue: 0.5, duration: 260, useNativeDriver: true }).start(() => {
      setRevealed(result.item);
      Animated.parallel([
        Animated.timing(flipAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.55, duration: 700, useNativeDriver: true }),
        ]),
      ]).start(() => {
        setDrawing(false);
        refresh();
      });
    });
  }

  async function handleEquip(id) {
    await equip(id);
    refresh();
  }

  const rotateY = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '0deg'],
  });
  const floatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const rarity = revealed ? RARITY[revealed.rarity] : null;

  return (
    <LinearGradient colors={['#060610', '#120a24', '#080814']} style={styles.fill}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🎴 Card Vault</Text>
          <Animated.View style={[styles.tokenChip, { transform: [{ scale: tokenPulse }] }]}>
            <Text style={styles.tokenText}>🪙 {tokens}</Text>
          </Animated.View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Draw area */}
          <View style={styles.drawArea}>
            <Animated.View
              style={[
                styles.card,
                { transform: [{ perspective: 800 }, { rotateY }, { translateY: revealed ? 0 : floatY }] },
                revealed && rarity && {
                  borderColor: rarity.color,
                  shadowColor: rarity.color,
                },
              ]}
            >
              {revealed && rarity ? (
                <>
                  <Animated.View
                    style={[styles.cardGlow, { backgroundColor: rarity.color, opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] }) }]}
                    pointerEvents="none"
                  />
                  <Text style={[styles.cardRarity, { color: rarity.color }]}>{rarity.label.toUpperCase()}</Text>
                  <Text style={styles.cardIcon}>{revealed.icon}</Text>
                  <Text style={styles.cardName}>{revealed.name}</Text>
                  <Text style={styles.cardKind}>{revealed.kind === 'theme' ? 'Tile Theme' : 'Merge Effect'}</Text>
                  {revealed.kind === 'theme' && <ThemeStrip themeId={revealed.id} />}
                  <TouchableOpacity style={[styles.equipBtn, { borderColor: rarity.color }]} onPress={() => handleEquip(revealed.id)}>
                    <Text style={[styles.equipBtnText, { color: rarity.color }]}>
                      {(equipped.theme === revealed.id || equipped.effect === revealed.id) ? '✓ EQUIPPED' : 'EQUIP NOW'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.cardBackIcon}>🎴</Text>
                  <Text style={styles.cardBackText}>?</Text>
                </>
              )}
            </Animated.View>

            <TouchableOpacity
              style={[styles.drawBtn, (tokens < 1 || drawing) && styles.btnDim]}
              onPress={handleDraw}
              disabled={drawing}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#7c4dff', '#00d4ff']} style={styles.drawGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.drawText}>DRAW CARD  ·  🪙 1</Text>
              </LinearGradient>
            </TouchableOpacity>

            {adReady && (
              <TouchableOpacity style={styles.adBtn} onPress={showAd} activeOpacity={0.85}>
                <Text style={styles.adBtnText}>📺  Watch ad  ·  +1 token</Text>
              </TouchableOpacity>
            )}

            {message && <Text style={styles.message}>{message}</Text>}
            <Text style={styles.fairNote}>Cosmetics only — no gameplay advantage. Fair for everyone.</Text>
          </View>

          {/* Collection */}
          <Text style={styles.sectionTitle}>COLLECTION  ·  {owned.length}/{CATALOG.length}</Text>
          <View style={styles.grid}>
            {CATALOG.map(item => {
              const isOwned = owned.includes(item.id);
              const isEquipped = equipped.theme === item.id || equipped.effect === item.id;
              const r = RARITY[item.rarity];
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.gridCard,
                    { borderColor: isOwned ? r.color : '#ffffff15' },
                    isEquipped && styles.gridCardEquipped,
                  ]}
                  onPress={() => isOwned && handleEquip(item.id)}
                  activeOpacity={isOwned ? 0.8 : 1}
                >
                  <Text style={[styles.gridIcon, !isOwned && styles.lockedIcon]}>{isOwned ? item.icon : '🔒'}</Text>
                  <Text style={[styles.gridName, !isOwned && { color: '#444' }]} numberOfLines={1}>
                    {isOwned ? item.name : '???'}
                  </Text>
                  <Text style={[styles.gridRarity, { color: isOwned ? r.color : '#333' }]}>{r.label}</Text>
                  {isEquipped && <Text style={styles.equippedBadge}>✓ ON</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
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
  tokenChip: {
    backgroundColor: '#ffd70015', borderRadius: 50,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: '#ffd70050',
  },
  tokenText: { color: '#ffd700', fontSize: 15, fontWeight: '900' },

  scroll: { padding: 20, alignItems: 'center' },

  drawArea: { alignItems: 'center', width: '100%', marginBottom: 26 },
  card: {
    width: 200, height: 270, borderRadius: 18,
    backgroundColor: '#14102a',
    borderWidth: 2, borderColor: '#7c4dff60',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7c4dff', shadowOpacity: 0.5, shadowRadius: 16, elevation: 10,
    marginBottom: 20, overflow: 'hidden',
  },
  cardGlow: { ...StyleSheet.absoluteFillObject },
  cardBackIcon: { fontSize: 64 },
  cardBackText: { color: '#7c4dff', fontSize: 44, fontWeight: '900', marginTop: 6 },
  cardRarity: { fontSize: 12, fontWeight: '900', letterSpacing: 3, marginBottom: 8 },
  cardIcon: { fontSize: 56 },
  cardName: { color: '#fff', fontSize: 19, fontWeight: '900', marginTop: 8 },
  cardKind: { color: '#888', fontSize: 12, marginTop: 2, marginBottom: 10 },
  themeStrip: { flexDirection: 'row', gap: 4, marginBottom: 10 },
  stripTile: {
    width: 34, height: 34, borderRadius: 5, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  stripText: { fontSize: 10, fontWeight: '900' },
  equipBtn: {
    borderWidth: 1.5, borderRadius: 50,
    paddingHorizontal: 22, paddingVertical: 8,
  },
  equipBtnText: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },

  drawBtn: { width: '80%', borderRadius: 50, overflow: 'hidden', marginBottom: 10 },
  btnDim: { opacity: 0.45 },
  drawGrad: { paddingVertical: 16, alignItems: 'center' },
  drawText: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 2 },
  adBtn: {
    backgroundColor: '#ffd70012', borderRadius: 50,
    paddingHorizontal: 24, paddingVertical: 12,
    borderWidth: 1, borderColor: '#ffd70050',
  },
  adBtnText: { color: '#ffd700', fontSize: 14, fontWeight: '800' },
  message: { color: '#ff7700', fontSize: 13, fontWeight: '600', marginTop: 12, textAlign: 'center' },
  fairNote: { color: '#444', fontSize: 11, marginTop: 12, textAlign: 'center' },

  sectionTitle: {
    color: '#555', fontSize: 12, fontWeight: '800', letterSpacing: 2,
    alignSelf: 'flex-start', marginBottom: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%' },
  gridCard: {
    width: '30.5%', aspectRatio: 0.82,
    backgroundColor: '#ffffff07', borderRadius: 14, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', padding: 6,
  },
  gridCardEquipped: { backgroundColor: '#7c4dff18' },
  gridIcon: { fontSize: 30 },
  lockedIcon: { opacity: 0.5 },
  gridName: { color: '#ccc', fontSize: 11, fontWeight: '700', marginTop: 6 },
  gridRarity: { fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  equippedBadge: { color: '#00d4ff', fontSize: 9, fontWeight: '900', marginTop: 4 },
});
