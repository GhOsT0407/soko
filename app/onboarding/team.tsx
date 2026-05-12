import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { T, FONT } from '@/constants/theme'
import { TEAM_SIZES, TRACKING_METHODS } from '@/constants/data'
import type { TeamSizeId, TrackingMethodId } from '@/constants/data'
import { useStore } from '@/store'

export default function TeamScreen() {
  const updateProfile = useStore((s) => s.updateProfile)
  const profile = useStore((s) => s.profile)
  const teamSize = profile.teamSize as TeamSizeId | ''
  const trackingMethod = profile.trackingMethod as TrackingMethodId | ''

  const canContinue = !!teamSize && !!trackingMethod

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>

        <ProgressBar step={3} />

        <Text style={s.label}>STEP 3 OF 3</Text>
        <Text style={s.title}>Two quick{'\n'}questions</Text>
        <Text style={s.sub}>Almost done — just a couple more things.</Text>

        <View style={s.section}>
          <Text style={s.sectionTitle}>How big is your team?</Text>
          <View style={s.grid}>
            {TEAM_SIZES.map((ts) => {
              const active = teamSize === ts.id
              return (
                <TouchableOpacity
                  key={ts.id}
                  style={[s.tile, active && s.tileActive]}
                  onPress={() => updateProfile({ teamSize: ts.id })}
                  activeOpacity={0.8}
                >
                  <Text style={s.tileEmoji}>{ts.emoji}</Text>
                  <Text style={[s.tileLabel, active && s.tileLabelActive]}>{ts.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>How do you track sales now?</Text>
          <View style={s.list}>
            {TRACKING_METHODS.map((tm) => {
              const active = trackingMethod === tm.id
              return (
                <TouchableOpacity
                  key={tm.id}
                  style={[s.row, active && s.rowActive]}
                  onPress={() => updateProfile({ trackingMethod: tm.id })}
                  activeOpacity={0.8}
                >
                  <Text style={s.rowEmoji}>{tm.emoji}</Text>
                  <Text style={[s.rowLabel, active && s.rowLabelActive]}>{tm.label}</Text>
                  {active && <Text style={s.check}>✓</Text>}
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        <TouchableOpacity
          style={[s.cta, !canContinue && s.ctaDisabled]}
          onPress={() => canContinue && router.push('/onboarding/welcome')}
          activeOpacity={0.85}
        >
          <Text style={[s.ctaText, !canContinue && s.ctaTextDisabled]}>
            {canContinue ? 'Set up my Soko →' : 'Answer both questions'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function ProgressBar({ step }: { step: number }) {
  return (
    <View style={s.progress}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[s.progressDot, i <= step && s.progressDotActive]} />
      ))}
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { flexGrow: 1, padding: 26, paddingTop: 16, gap: 16 },
  back: { marginBottom: 4 },
  backText: { fontSize: 14, color: T.muted },
  progress: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  progressDot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: T.border },
  progressDotActive: { backgroundColor: T.accent },
  label: { fontSize: 10, color: T.accent, fontFamily: FONT.mono, letterSpacing: 2 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: T.dark,
    letterSpacing: -0.5,
    fontFamily: FONT.serif,
    lineHeight: 34,
  },
  sub: { fontSize: 13, color: T.muted, marginTop: -4 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: T.dark },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    width: '47.5%',
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  tileActive: { backgroundColor: T.accentLight, borderColor: T.accent },
  tileEmoji: { fontSize: 22 },
  tileLabel: { fontSize: 12, fontWeight: '600', color: T.dark },
  tileLabelActive: { color: T.accentDark },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 14,
    padding: 14,
  },
  rowActive: { backgroundColor: T.accentLight, borderColor: T.accent },
  rowEmoji: { fontSize: 20 },
  rowLabel: { fontSize: 13, fontWeight: '600', color: T.dark, flex: 1 },
  rowLabelActive: { color: T.accentDark },
  check: { color: T.accent, fontSize: 16, fontWeight: '700' },
  cta: {
    backgroundColor: T.accent,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 4,
  },
  ctaDisabled: { backgroundColor: T.border },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ctaTextDisabled: { color: T.muted },
})
