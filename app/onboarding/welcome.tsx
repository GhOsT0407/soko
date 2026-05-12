import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { T, FONT } from '@/constants/theme'
import { BUSINESS_TYPES, TAILORED } from '@/constants/data'
import { useStore } from '@/store'
import type { BusinessTypeId } from '@/constants/data'

export default function WelcomeScreen() {
  const profile = useStore((s) => s.profile)
  const setOnboarded = useStore((s) => s.setOnboarded)

  const btypeId = (profile.businessType || 'trader') as BusinessTypeId
  const btype = BUSINESS_TYPES.find((b) => b.id === btypeId) || BUSINESS_TYPES[0]
  const tailored = TAILORED[btypeId] || TAILORED.trader
  const name = profile.businessName || 'Your Business'
  const owner = profile.ownerName ? `, ${profile.ownerName}` : ''

  const features = [
    { icon: '₦', label: tailored.saleLabel, desc: 'Log every transaction fast' },
    { icon: '📦', label: tailored.inventoryLabel, desc: 'Track what you have in stock' },
    { icon: '📋', label: tailored.customerLabel, desc: 'See who owes you money' },
    { icon: '💬', label: 'WhatsApp Receipts', desc: 'Send invoices instantly' },
  ]

  function onOpen() {
    setOnboarded(true)
    router.replace('/(tabs)')
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.emojiBox}>
          <Text style={s.emoji}>{btype.emoji}</Text>
        </View>

        <Text style={s.mono}>ALL SET</Text>
        <Text style={s.title}>Welcome{owner}!</Text>
        <Text style={s.sub}>
          We've set up <Text style={s.bold}>{name}</Text> as a{' '}
          <Text style={s.bold}>{btype.label}</Text>. Here's what's ready for you.
        </Text>

        <View style={s.features}>
          {features.map((f, i) => (
            <View key={i} style={s.featureRow}>
              <View style={s.featureIcon}>
                <Text style={s.featureIconText}>{f.icon}</Text>
              </View>
              <View style={s.featureText}>
                <Text style={s.featureLabel}>{f.label}</Text>
                <Text style={s.featureDesc}>{f.desc}</Text>
              </View>
              <Text style={s.check}>✓</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={s.cta} onPress={onOpen} activeOpacity={0.85}>
          <Text style={s.ctaText}>Open My Dashboard →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { flexGrow: 1, padding: 26, paddingTop: 40, gap: 16, alignItems: 'center' },
  emojiBox: {
    width: 80,
    height: 80,
    backgroundColor: T.accentLight,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emoji: { fontSize: 36 },
  mono: { fontSize: 10, color: T.accent, fontFamily: FONT.mono, letterSpacing: 3 },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: T.dark,
    letterSpacing: -0.5,
    fontFamily: FONT.serif,
    textAlign: 'center',
  },
  sub: { fontSize: 14, color: T.muted, textAlign: 'center', lineHeight: 20 },
  bold: { color: T.dark, fontWeight: '700' },
  features: { width: '100%', gap: 10, marginTop: 4 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    padding: 14,
  },
  featureIcon: {
    width: 36,
    height: 36,
    backgroundColor: T.accentLight,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconText: { fontSize: 16 },
  featureText: { flex: 1 },
  featureLabel: { fontSize: 13, fontWeight: '700', color: T.dark },
  featureDesc: { fontSize: 11, color: T.faint, marginTop: 1 },
  check: { color: T.green, fontSize: 16, fontWeight: '700' },
  cta: {
    width: '100%',
    backgroundColor: T.accent,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 4,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
