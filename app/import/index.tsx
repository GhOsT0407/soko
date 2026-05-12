import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { T, FONT } from '@/constants/theme'
import { useStore } from '@/store'

export default function ImportHubScreen() {
  const trackingMethod = useStore((s) => s.profile.trackingMethod)

  const options = [
    {
      id: 'photo',
      icon: '📷',
      title: 'Snap Your Notebook',
      desc: 'Take a photo of your sales page — it stays visible as you type in the numbers',
      recommended: trackingMethod === 'notebook' || trackingMethod === 'memory',
      route: '/import/photo',
      color: T.green,
      glow: T.greenGlow,
      colorLight: T.greenLight,
    },
    {
      id: 'manual',
      icon: '📓',
      title: 'Type from Notebook',
      desc: 'Enter date by date — just like copying from your paper book',
      recommended: false,
      route: '/import/manual',
      color: T.accent,
      glow: T.accentGlow,
      colorLight: T.accentLight,
    },
    {
      id: 'csv',
      icon: '📊',
      title: 'Paste from Spreadsheet',
      desc: 'Copy from Excel or Google Sheets — we read the columns automatically',
      recommended: trackingMethod === 'excel',
      route: '/import/csv',
      color: T.revenue,
      glow: T.revenueGlow,
      colorLight: T.revenueLight,
    },
  ]

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.orb1} />
        <View style={s.orb2} />
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Import Past Sales</Text>
        <Text style={s.sub}>
          Bring in old records so Soko can calculate your monthly and yearly totals.
        </Text>
      </View>

      <View style={s.body}>
        <Text style={s.hint}>CHOOSE YOUR METHOD</Text>

        {options.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[s.card, opt.recommended && { borderColor: opt.color, borderTopColor: opt.color }]}
            onPress={() => router.push(opt.route as any)}
            activeOpacity={0.8}
          >
            {opt.recommended && (
              <View style={[s.cardGlow, { backgroundColor: opt.color }]} />
            )}
            <View style={[s.cardTopEdge, { backgroundColor: opt.recommended ? opt.color : T.glassTopBorder }]} />

            {opt.recommended && (
              <View style={[s.badge, { backgroundColor: opt.color }]}>
                <Text style={s.badgeText}>RECOMMENDED FOR YOU</Text>
              </View>
            )}

            <View style={s.cardRow}>
              <View style={[s.iconBox, { backgroundColor: opt.colorLight, borderColor: opt.color + '30' }]}>
                <Text style={s.icon}>{opt.icon}</Text>
              </View>
              <View style={s.cardBody}>
                <Text style={[s.cardTitle, opt.recommended && { color: opt.color }]}>{opt.title}</Text>
                <Text style={s.cardDesc}>{opt.desc}</Text>
              </View>
              <Text style={[s.arrow, opt.recommended && { color: opt.color }]}>→</Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={s.infoCard}>
          <View style={s.infoCardTopEdge} />
          <View style={s.infoRow}>
            <Text style={s.infoIcon}>💡</Text>
            <Text style={s.infoText}>
              Imported sales are added to your history and count toward all monthly and yearly revenue totals.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  header: {
    backgroundColor: T.dark,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 28,
    overflow: 'hidden',
    position: 'relative',
    gap: 6,
  },
  orb1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: T.accentMid,
    opacity: 0.1,
    top: -60,
    right: -50,
  },
  orb2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: T.green,
    opacity: 0.06,
    bottom: -30,
    left: 30,
  },
  back: { color: 'rgba(255,255,255,0.35)', fontSize: 14, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 19 },

  body: { flex: 1, padding: 20, gap: 12 },
  hint: {
    fontSize: 9,
    color: T.muted,
    fontFamily: FONT.mono,
    letterSpacing: 2,
    marginBottom: 4,
  },

  card: {
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTopEdge: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  cardGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    top: -40,
    right: -20,
    opacity: 0.07,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 8, color: '#fff', fontWeight: '700', fontFamily: FONT.mono, letterSpacing: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 24 },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: T.text },
  cardDesc: { fontSize: 12, color: T.muted, lineHeight: 17 },
  arrow: { fontSize: 18, color: T.faint },

  infoCard: {
    backgroundColor: T.accentLight,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)',
    borderRadius: 16,
    padding: 14,
    overflow: 'hidden',
    position: 'relative',
    marginTop: 4,
  },
  infoCardTopEdge: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: T.accent,
    opacity: 0.4,
  },
  infoRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  infoIcon: { fontSize: 15 },
  infoText: { flex: 1, fontSize: 12, color: T.accent, lineHeight: 18 },
})
