import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const RULES = [
  { icon: '⬇️',  title: 'Drop Tiles',        desc: 'Tap any column to drop the current tile into it. The tile falls to the lowest available position.' },
  { icon: '🔗',  title: 'Merge to Score',     desc: 'When two identical tiles stack on each other, they merge into one tile worth double the value.' },
  { icon: '⚡',  title: 'Chain Reactions',    desc: 'A single drop can trigger cascading merges: 2+2→4, then 4+4→8, and so on. These score huge points.' },
  { icon: '⭐',  title: 'Reach 2048',         desc: 'Forming a 2048 tile earns 4096 bonus points and clears that tile — giving you breathing room.' },
  { icon: '⏱',  title: 'Beat the Clock',     desc: 'The timer drains constantly — and faster as your score climbs. Every merge buys time back (deeper chains pay more). Hit zero and it\'s over.' },
  { icon: '🔥',  title: 'Combo Multiplier',   desc: 'Merge on consecutive drops to build a combo — every merge in a row multiplies your score, up to ×5. Miss a merge and it resets.' },
  { icon: '🌟',  title: 'GOLD RUSH',          desc: 'Chain merges fill the Gold Rush meter. When it\'s full you get 5 golden wildcard tiles (★) that merge with ANY tile — and all scores are ×3!' },
  { icon: '🏆',  title: 'Global Leaderboard', desc: 'Your best score competes worldwide, in your region, and in your country. Climb all three boards!' },
  { icon: '🎴',  title: 'Card Vault',         desc: 'Earn tokens by playing daily (streaks pay more) or watching ads, then draw from 140 collectibles: 30 color themes, 100 ranked tile designs, and 10 merge effects. The higher the rank — Common to Mythic — the more beautiful the card. Pure cosmetics, zero gameplay advantage.' },
  { icon: '↩️',  title: 'Undo Last Drop',     desc: 'Changed your mind? Undo reverses your last move. You get 3 free per game. Watch an ad for unlimited undos.' },
  { icon: '💣',  title: 'Bomb Power-Up',      desc: 'Watch an ad to earn a Bomb. Activate it, then tap any column to destroy its top tile.' },
  { icon: '📺',  title: 'Continue Playing',   desc: 'When the board fills up, watch a video ad to clear the top of each column and keep your score.' },
  { icon: '💀',  title: 'Game Over',          desc: 'When every column is completely full with no legal drops remaining, the game ends.' },
];

const TIPS = [
  'Save your wildcards for the biggest tile on the board — a ★ on a 512 makes a 1024 instantly.',
  'Protect your combo: a drop with no merge resets the multiplier to ×1.',
  'Keep the tallest column in the center — easier to set up chain merges.',
  'Never fill one column all the way — you need flexibility to undo.',
  'Small tiles (2, 4) pile up fast. Try to merge them before they reach the top.',
  'A chain merge from a single 2-drop is worth far more than individual scores.',
  'Plan 2-3 drops ahead to set up a high-value cascade.',
];

export default function HowToPlayScreen({ navigation }) {
  return (
    <LinearGradient colors={['#060610', '#0a0a1a']} style={styles.fill}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>How to Play</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {RULES.map((r, i) => (
            <View key={i} style={styles.ruleCard}>
              <Text style={styles.ruleIcon}>{r.icon}</Text>
              <View style={styles.ruleBody}>
                <Text style={styles.ruleTitle}>{r.title}</Text>
                <Text style={styles.ruleDesc}>{r.desc}</Text>
              </View>
            </View>
          ))}

          <View style={styles.tipBox}>
            <Text style={styles.tipHeader}>🧠 Strategy Tips</Text>
            {TIPS.map((t, i) => (
              <Text key={i} style={styles.tipItem}>• {t}</Text>
            ))}
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
  list: { padding: 16, gap: 10 },
  ruleCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#ffffff08', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#ffffff10',
  },
  ruleIcon: { fontSize: 28, marginRight: 14, minWidth: 36 },
  ruleBody: { flex: 1 },
  ruleTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  ruleDesc: { color: '#888', fontSize: 13, lineHeight: 20 },
  tipBox: {
    backgroundColor: '#7c4dff18', borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: '#7c4dff40', marginTop: 4,
  },
  tipHeader: { color: '#7c4dff', fontSize: 15, fontWeight: '800', marginBottom: 12 },
  tipItem: { color: '#aaa', fontSize: 13, lineHeight: 22 },
});
