import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, ScrollView, TextInput, ActivityIndicator,
  Modal, Clipboard, Platform, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getLeaderboard, getPlayerName, setPlayerName, flagEmoji,
  getMyBoards, createCustomBoard, joinCustomBoard, leaveCustomBoard,
  shareBoard, getPrivateLeaderboard,
} from '../utils/leaderboard';

const TABS = [
  { key: 'global',  label: '🌍 Global'  },
  { key: 'region',  label: '🗺 Region'  },
  { key: 'country', label: '🚩 Country' },
  { key: 'leagues', label: '🏅 Leagues' },
];

const PODIUM_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32'];

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
      style={[styles.row, entry.you && styles.rowYou, { opacity: anim, transform: [{ translateX }] }]}
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

// ── Board Panel (inline leaderboard for a private league) ────────────────────
function BoardPanel({ board, onBack, onShare, onLeave }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getPrivateLeaderboard(board.code).then(d => {
      setData(d);
      setLoading(false);
    });
  }, [board.code]);

  function copyCode() {
    Clipboard.setString(board.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const top3 = data?.entries.slice(0, 3) ?? [];
  const rest  = data?.entries.slice(3) ?? [];

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.boardHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Leagues</Text>
        </TouchableOpacity>
        <Text style={styles.boardTitle} numberOfLines={1}>{board.name}</Text>
        <TouchableOpacity onPress={() => onShare(board)} style={styles.shareBtn}>
          <Text style={styles.shareText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Invite code chip */}
      <TouchableOpacity style={styles.codeChip} onPress={copyCode} activeOpacity={0.75}>
        <Text style={styles.codeLabel}>CODE</Text>
        <Text style={styles.codeValue}>{board.code}</Text>
        <Text style={styles.codeCopy}>{copied ? '✓ Copied!' : 'Tap to copy'}</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator color="#7c4dff" size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {top3.length > 0 && (
            <View style={styles.podium}>
              <Pedestal entry={top3[1]} place={2} delay={150} />
              <Pedestal entry={top3[0]} place={1} delay={0} />
              <Pedestal entry={top3[2]} place={3} delay={300} />
            </View>
          )}
          {data?.playerRank && (
            <View style={styles.youBanner}>
              <Text style={styles.youBannerText}>
                You're ranked <Text style={styles.youBannerRank}>#{data.playerRank}</Text> in this league
              </Text>
            </View>
          )}
          {rest.map((e, i) => (
            <RankRow key={`${e.name}-${i}`} entry={e} rank={i + 4} delay={400 + i * 45} />
          ))}
          {!board.isOwner && (
            <TouchableOpacity style={styles.leaveBtn} onPress={onLeave}>
              <Text style={styles.leaveBtnText}>Leave League</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ── Leagues List ─────────────────────────────────────────────────────────────
function LeaguesList({ boards, onSelect, onAdd }) {
  if (boards.length === 0) {
    return (
      <View style={styles.emptyLeague}>
        <Text style={styles.emptyLeagueEmoji}>🏅</Text>
        <Text style={styles.emptyLeagueTitle}>No leagues yet</Text>
        <Text style={styles.emptyLeagueSub}>Create a league and challenge friends, or join one with a code.</Text>
        <TouchableOpacity style={styles.addLeagueBtn} onPress={onAdd}>
          <LinearGradient colors={['#7c4dff', '#00d4ff']} style={styles.addLeagueBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.addLeagueBtnText}>+ Create or Join League</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <TouchableOpacity style={styles.addRow} onPress={onAdd}>
        <Text style={styles.addRowText}>+ Create or Join League</Text>
      </TouchableOpacity>
      {boards.map(b => (
        <TouchableOpacity key={b.code} style={styles.leagueRow} onPress={() => onSelect(b)}>
          <View style={styles.leagueRowLeft}>
            <Text style={styles.leagueRowName}>{b.name}</Text>
            <Text style={styles.leagueRowCode}>Code: {b.code} {b.isOwner ? '· Owner' : ''}</Text>
          </View>
          <Text style={styles.leagueRowArrow}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ── Create/Join Modal ─────────────────────────────────────────────────────────
function LeagueModal({ visible, onClose, onCreated, onJoined }) {
  const [mode, setMode] = useState(null); // null | 'create' | 'join' | 'created'
  const [nameInput, setNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [newBoard, setNewBoard] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  function reset() {
    setMode(null); setNameInput(''); setCodeInput('');
    setNewBoard(null); setError(''); setBusy(false); setCopied(false);
  }

  function handleClose() { reset(); onClose(); }

  async function handleCreate() {
    if (nameInput.trim().length < 2) { setError('Name must be at least 2 characters.'); return; }
    setBusy(true); setError('');
    const board = await createCustomBoard(nameInput.trim());
    setNewBoard(board);
    setMode('created');
    setBusy(false);
    onCreated(board);
  }

  async function handleJoin() {
    if (codeInput.trim().length < 4) { setError('Enter a valid 4-6 character code.'); return; }
    setBusy(true); setError('');
    const result = await joinCustomBoard(codeInput.trim());
    if (result.error === 'already_joined') { setError('You already belong to this league.'); setBusy(false); return; }
    if (result.error) { setError('League not found. Check the code and try again.'); setBusy(false); return; }
    setBusy(false);
    onJoined(result);
    handleClose();
  }

  function copyCode() {
    if (!newBoard) return;
    Clipboard.setString(newBoard.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function doShare() {
    if (newBoard) shareBoard(newBoard.code, newBoard.name);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} activeOpacity={1} />
        <View style={styles.modalSheet}>
          {mode === null && (
            <>
              <Text style={styles.modalTitle}>Leagues</Text>
              <Text style={styles.modalSub}>Compete in a private leaderboard with friends.</Text>
              <TouchableOpacity style={styles.modalBigBtn} onPress={() => setMode('create')}>
                <LinearGradient colors={['#7c4dff', '#5c35cc']} style={styles.modalBigBtnGrad}>
                  <Text style={styles.modalBigBtnEmoji}>✨</Text>
                  <Text style={styles.modalBigBtnText}>Create New League</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBigBtn, { marginTop: 10 }]} onPress={() => setMode('join')}>
                <LinearGradient colors={['#00695c', '#00897b']} style={styles.modalBigBtnGrad}>
                  <Text style={styles.modalBigBtnEmoji}>🔑</Text>
                  <Text style={styles.modalBigBtnText}>Join with Code</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancel} onPress={handleClose}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

          {mode === 'create' && (
            <>
              <Text style={styles.modalTitle}>New League</Text>
              <Text style={styles.modalSub}>Give your league a name.</Text>
              <TextInput
                style={styles.modalInput}
                value={nameInput}
                onChangeText={t => { setNameInput(t); setError(''); }}
                placeholder="e.g. Office Rivals"
                placeholderTextColor="#444"
                maxLength={24}
                autoFocus
              />
              {error ? <Text style={styles.modalError}>{error}</Text> : null}
              <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleCreate} disabled={busy}>
                <LinearGradient colors={['#7c4dff', '#00d4ff']} style={styles.modalPrimaryBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.modalPrimaryBtnText}>{busy ? 'Creating…' : 'CREATE LEAGUE'}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setMode(null)}>
                <Text style={styles.modalCancelText}>Back</Text>
              </TouchableOpacity>
            </>
          )}

          {mode === 'join' && (
            <>
              <Text style={styles.modalTitle}>Join League</Text>
              <Text style={styles.modalSub}>Enter the 6-character code shared by a friend.</Text>
              <TextInput
                style={[styles.modalInput, { letterSpacing: 6, textTransform: 'uppercase' }]}
                value={codeInput}
                onChangeText={t => { setCodeInput(t.toUpperCase()); setError(''); }}
                placeholder="ABC123"
                placeholderTextColor="#444"
                maxLength={6}
                autoCapitalize="characters"
                autoFocus
              />
              {error ? <Text style={styles.modalError}>{error}</Text> : null}
              <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleJoin} disabled={busy}>
                <LinearGradient colors={['#00695c', '#00d4ff']} style={styles.modalPrimaryBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.modalPrimaryBtnText}>{busy ? 'Joining…' : 'JOIN'}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setMode(null)}>
                <Text style={styles.modalCancelText}>Back</Text>
              </TouchableOpacity>
            </>
          )}

          {mode === 'created' && newBoard && (
            <>
              <Text style={styles.modalTitle}>League Created! 🎉</Text>
              <Text style={styles.modalSub}>Share this code with friends so they can join.</Text>
              <TouchableOpacity style={styles.bigCodeBox} onPress={copyCode} activeOpacity={0.8}>
                <Text style={styles.bigCode}>{newBoard.code}</Text>
                <Text style={styles.bigCodeHint}>{copied ? '✓ Copied to clipboard!' : 'Tap to copy'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryBtn} onPress={doShare}>
                <LinearGradient colors={['#7c4dff', '#00d4ff']} style={styles.modalPrimaryBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.modalPrimaryBtnText}>SHARE INVITE</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancel} onPress={handleClose}>
                <Text style={styles.modalCancelText}>Done</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function LeaderboardScreen({ navigation }) {
  const [scope, setScope]           = useState('global');
  const [board, setBoard]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [needName, setNeedName]     = useState(false);
  const [nameInput, setNameInput]   = useState('');
  const [myBoards, setMyBoards]     = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [showModal, setShowModal]   = useState(false);

  const load = useCallback(async (s) => {
    setLoading(true);
    const data = await getLeaderboard(s);
    setBoard(data);
    setLoading(false);
  }, []);

  const refreshBoards = useCallback(async () => {
    const b = await getMyBoards();
    setMyBoards(b);
  }, []);

  useEffect(() => {
    getPlayerName().then(name => {
      if (!name) setNeedName(true);
      load(scope);
    });
    refreshBoards();
  }, []);

  function switchTab(s) {
    if (s === scope) return;
    setScope(s);
    setSelectedBoard(null);
    if (s !== 'leagues') load(s);
  }

  async function saveName() {
    const clean = nameInput.trim();
    if (clean.length < 2) return;
    await setPlayerName(clean);
    setNeedName(false);
    load(scope);
  }

  function handleLeave(code) {
    leaveCustomBoard(code);
    setSelectedBoard(null);
    refreshBoards();
  }

  const top3 = board?.entries.slice(0, 3) ?? [];
  const rest  = board?.entries.slice(3) ?? [];
  const scopeLabel =
    scope === 'country' ? `${flagEmoji(board?.geo?.code)} ${board?.geo?.name ?? ''}` :
    scope === 'region'  ? board?.geo?.region ?? 'Region' : 'Worldwide';

  return (
    <LinearGradient colors={['#060610', '#0d0a1f', '#080814']} style={styles.fill}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={selectedBoard ? () => setSelectedBoard(null) : () => navigation.goBack()}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>← {selectedBoard ? 'Leagues' : 'Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🏆 Leaderboard</Text>
          {scope === 'leagues' && !selectedBoard ? (
            <TouchableOpacity style={styles.addIconBtn} onPress={() => setShowModal(true)}>
              <Text style={styles.addIconText}>＋</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
              {TABS.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.tab, scope === t.key && styles.tabActive]}
                  onPress={() => switchTab(t.key)}
                >
                  <Text style={[styles.tabText, scope === t.key && styles.tabTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Leagues tab */}
            {scope === 'leagues' ? (
              selectedBoard ? (
                <BoardPanel
                  board={selectedBoard}
                  onBack={() => setSelectedBoard(null)}
                  onShare={b => shareBoard(b.code, b.name)}
                  onLeave={() => handleLeave(selectedBoard.code)}
                />
              ) : (
                <LeaguesList
                  boards={myBoards}
                  onSelect={setSelectedBoard}
                  onAdd={() => setShowModal(true)}
                />
              )
            ) : (
              <>
                <Text style={styles.scopeLabel}>{scopeLabel}</Text>
                {loading ? (
                  <View style={styles.loading}><ActivityIndicator color="#7c4dff" size="large" /></View>
                ) : (
                  <ScrollView key={scope} contentContainerStyle={styles.list}>
                    {top3.length > 0 && (
                      <View style={styles.podium}>
                        <Pedestal entry={top3[1]} place={2} delay={150} />
                        <Pedestal entry={top3[0]} place={1} delay={0} />
                        <Pedestal entry={top3[2]} place={3} delay={300} />
                      </View>
                    )}
                    {board?.playerRank && (
                      <View style={styles.youBanner}>
                        <Text style={styles.youBannerText}>
                          You're ranked <Text style={styles.youBannerRank}>#{board.playerRank}</Text> {scope === 'global' ? 'worldwide' : `in ${scopeLabel}`}
                        </Text>
                      </View>
                    )}
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
          </>
        )}

        <LeagueModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          onCreated={b => { refreshBoards(); setShowModal(false); setSelectedBoard(b); }}
          onJoined={b => { refreshBoards(); setShowModal(false); setSelectedBoard(b); }}
        />
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
  backBtn: { padding: 4, minWidth: 60 },
  backText: { color: '#7c4dff', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  addIconBtn: { minWidth: 60, alignItems: 'flex-end', padding: 4 },
  addIconText: { color: '#7c4dff', fontSize: 22, fontWeight: '700' },

  tabsScroll: { flexGrow: 0 },
  tabs: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4,
  },
  tab: {
    paddingHorizontal: 14, paddingVertical: 10,
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
    borderWidth: 1, borderColor: '#00d4ff40', marginBottom: 14, alignItems: 'center',
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
    paddingHorizontal: 18, paddingVertical: 14, textAlign: 'center', marginBottom: 18,
  },
  nameBtn: { width: '100%', borderRadius: 50, overflow: 'hidden' },
  nameBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  nameBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 2 },

  // Board panel
  boardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#ffffff10',
  },
  boardTitle: { color: '#fff', fontSize: 16, fontWeight: '800', flex: 1, textAlign: 'center', marginHorizontal: 8 },
  shareBtn: { padding: 4 },
  shareText: { color: '#00d4ff', fontSize: 14, fontWeight: '700' },

  codeChip: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
    backgroundColor: '#7c4dff18', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10,
    borderWidth: 1, borderColor: '#7c4dff40', marginVertical: 10, gap: 10,
  },
  codeLabel: { color: '#7c4dff', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  codeValue: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 4 },
  codeCopy: { color: '#555', fontSize: 11 },

  leaveBtn: {
    marginTop: 20, alignSelf: 'center',
    backgroundColor: '#ff000015', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12,
    borderWidth: 1, borderColor: '#ff000030',
  },
  leaveBtnText: { color: '#ff4444', fontSize: 14, fontWeight: '700' },

  // Leagues list
  emptyLeague: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyLeagueEmoji: { fontSize: 52, marginBottom: 12 },
  emptyLeagueTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 8 },
  emptyLeagueSub: { color: '#777', fontSize: 14, textAlign: 'center', marginBottom: 28, lineHeight: 22 },
  addLeagueBtn: { width: '100%', borderRadius: 50, overflow: 'hidden' },
  addLeagueBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  addLeagueBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },

  addRow: {
    backgroundColor: '#7c4dff18', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#7c4dff40', marginBottom: 12, alignItems: 'center',
  },
  addRowText: { color: '#7c4dff', fontSize: 14, fontWeight: '800' },

  leagueRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff08', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#ffffff10', marginBottom: 8,
  },
  leagueRowLeft: { flex: 1 },
  leagueRowName: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 2 },
  leagueRowCode: { color: '#666', fontSize: 12 },
  leagueRowArrow: { color: '#555', fontSize: 22, marginLeft: 10 },

  // Modal
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#12121f', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 28, paddingBottom: 40, borderWidth: 1, borderColor: '#ffffff12',
  },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  modalSub: { color: '#777', fontSize: 14, marginBottom: 24, textAlign: 'center' },
  modalBigBtn: { borderRadius: 18, overflow: 'hidden' },
  modalBigBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, gap: 10,
  },
  modalBigBtnEmoji: { fontSize: 22 },
  modalBigBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  modalInput: {
    backgroundColor: '#ffffff0a', borderRadius: 14, borderWidth: 1, borderColor: '#7c4dff60',
    color: '#fff', fontSize: 18, fontWeight: '700',
    paddingHorizontal: 18, paddingVertical: 14, textAlign: 'center', marginBottom: 14,
  },
  modalError: { color: '#ff6b6b', fontSize: 13, textAlign: 'center', marginBottom: 10 },
  modalPrimaryBtn: { borderRadius: 50, overflow: 'hidden', marginBottom: 8 },
  modalPrimaryBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  modalPrimaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 1.5 },
  modalCancel: { alignItems: 'center', paddingVertical: 12 },
  modalCancelText: { color: '#555', fontSize: 15 },

  bigCodeBox: {
    backgroundColor: '#7c4dff18', borderRadius: 20, padding: 24,
    borderWidth: 2, borderColor: '#7c4dff', alignItems: 'center', marginBottom: 20,
  },
  bigCode: { color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: 8 },
  bigCodeHint: { color: '#7c4dff', fontSize: 13, marginTop: 6, fontWeight: '700' },
});
