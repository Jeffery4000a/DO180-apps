import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const RULES = [
  { icon: '🫧', title: 'Pop Bubbles',      desc: 'Tap any bubble to pop it and earn points.' },
  { icon: '⭐', title: 'Gold Bubbles',     desc: 'Worth 10 points — rare and valuable!' },
  { icon: '🔵', title: 'Small Bubbles',    desc: 'Worth 5 pts. Tiny but mighty.' },
  { icon: '🟣', title: 'Medium Bubbles',   desc: 'Worth 3 pts. Most common.' },
  { icon: '🟠', title: 'Large Bubbles',    desc: 'Worth 1 pt. Easy to hit.' },
  { icon: '💣', title: 'Avoid Bombs!',     desc: 'Tapping a bomb costs 1 life. 3 strikes = game over.' },
  { icon: '⏱', title: '30-Second Rounds', desc: 'Pop as many as you can before time runs out.' },
  { icon: '📺', title: 'Watch Ads',        desc: 'Watch a short video after a round to earn +15 bonus seconds.' },
];

export default function HowToPlayScreen({ navigation }) {
  return (
    <LinearGradient colors={['#0a0a1a', '#1a0a2e']} style={styles.fill}>
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
              <View style={styles.ruleText}>
                <Text style={styles.ruleTitle}>{r.title}</Text>
                <Text style={styles.ruleDesc}>{r.desc}</Text>
              </View>
            </View>
          ))}

          <View style={styles.tipBox}>
            <Text style={styles.tipHeader}>💡 Revenue Tips (for Developers)</Text>
            <Text style={styles.tipBody}>
              • Banner ads show on Home & Game Over screens{'\n'}
              • Interstitials appear every 2nd game over{'\n'}
              • Rewarded ads are user-initiated (highest eCPM){'\n'}
              • Add mediation (ironSource, Meta AN) in AdMob{'\n'}
              • Target eCPM: $5–$15 for rewarded, $1–$5 for interstitials
            </Text>
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
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ffffff15',
  },
  backBtn: { padding: 4 },
  backText: { color: '#7c4dff', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  list: { padding: 20, gap: 12 },
  ruleCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#ffffff0a', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#ffffff12',
  },
  ruleIcon: { fontSize: 32, marginRight: 16, minWidth: 40 },
  ruleText: { flex: 1 },
  ruleTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  ruleDesc: { color: '#999', fontSize: 14, lineHeight: 20 },
  tipBox: {
    backgroundColor: '#7c4dff20', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#7c4dff40', marginTop: 8,
  },
  tipHeader: { color: '#7c4dff', fontSize: 15, fontWeight: '800', marginBottom: 10 },
  tipBody: { color: '#bbb', fontSize: 13, lineHeight: 22 },
});
