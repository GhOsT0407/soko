import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView } from 'react-native-safe-area-context'
import { T, FONT } from '@/constants/theme'

const FEATURES = [
  'Record sales in seconds',
  'Track who owes you money',
  'Works without internet',
  'Built for Nigerian business',
]

export default function SplashScreen() {
  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="dark" />
      <View style={s.content}>

        <View style={s.logoArea}>
          <View style={s.logoMark}>
            <Text style={s.logoLetter}>S</Text>
          </View>
          <Text style={s.wordmark}>soko</Text>
          <Text style={s.tagline}>EVERY SALE. EVERY NAIRA.</Text>
        </View>

        <View style={s.featureCard}>
          {FEATURES.map((f, i) => (
            <View key={i} style={s.featureRow}>
              <Text style={s.check}>✓</Text>
              <Text style={s.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={s.bottom}>
          <TouchableOpacity
            style={s.cta}
            onPress={() => router.push('/onboarding/name')}
            activeOpacity={0.85}
          >
            <Text style={s.ctaText}>Get Started — It's Free</Text>
          </TouchableOpacity>
          <Text style={s.sub}>No credit card. No complexity.</Text>
        </View>

      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 32,
  },
  logoArea: { alignItems: 'center', gap: 10 },
  logoMark: {
    width: 84,
    height: 84,
    backgroundColor: T.accent,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: { fontSize: 44, fontWeight: '900', color: '#fff' },
  wordmark: {
    fontSize: 54,
    fontWeight: '900',
    color: T.dark,
    letterSpacing: -2,
    fontFamily: FONT.serif,
  },
  tagline: {
    fontSize: 10,
    color: T.faint,
    letterSpacing: 3,
    fontFamily: FONT.mono,
  },
  featureCard: {
    width: '100%',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 22,
    gap: 14,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: { color: T.green, fontSize: 15, fontWeight: '700', width: 18 },
  featureText: { fontSize: 15, color: T.text, flex: 1 },
  bottom: { width: '100%', alignItems: 'center', gap: 12 },
  cta: {
    width: '100%',
    backgroundColor: T.accent,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 11, color: T.faint, fontFamily: FONT.mono, letterSpacing: 0.5 },
})
