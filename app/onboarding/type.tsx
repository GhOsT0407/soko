import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { T, FONT } from '@/constants/theme'
import { BUSINESS_TYPES } from '@/constants/data'
import type { BusinessTypeId } from '@/constants/data'
import { useStore } from '@/store'

export default function TypeScreen() {
  const updateProfile = useStore((s) => s.updateProfile)
  const selected = useStore((s) => s.profile.businessType) as BusinessTypeId | ''

  function select(id: BusinessTypeId) {
    updateProfile({ businessType: id })
  }

  function onContinue() {
    if (!selected) return
    router.push('/onboarding/team')
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>

        <ProgressBar step={2} />

        <Text style={s.label}>STEP 2 OF 3</Text>
        <Text style={s.title}>What kind of{'\n'}business do you run?</Text>
        <Text style={s.sub}>We'll tailor Soko to fit your work.</Text>

        <View style={s.grid}>
          {BUSINESS_TYPES.map((bt) => {
            const active = selected === bt.id
            return (
              <TouchableOpacity
                key={bt.id}
                style={[s.tile, active && s.tileActive]}
                onPress={() => select(bt.id)}
                activeOpacity={0.8}
              >
                <Text style={s.tileEmoji}>{bt.emoji}</Text>
                <Text style={[s.tileLabel, active && s.tileLabelActive]}>{bt.label}</Text>
                <Text style={s.tileDesc}>{bt.desc}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <TouchableOpacity
          style={[s.cta, !selected && s.ctaDisabled]}
          onPress={onContinue}
          activeOpacity={0.85}
        >
          <Text style={[s.ctaText, !selected && s.ctaTextDisabled]}>
            {selected ? 'This is my business →' : 'Select your business type'}
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
  scroll: { flexGrow: 1, padding: 26, paddingTop: 16, gap: 14 },
  back: { marginBottom: 8 },
  backText: { fontSize: 14, color: T.muted },
  progress: { flexDirection: 'row', gap: 6, marginBottom: 6 },
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  tile: {
    width: '47.5%',
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  tileActive: {
    backgroundColor: T.accentLight,
    borderColor: T.accent,
  },
  tileEmoji: { fontSize: 26, marginBottom: 4 },
  tileLabel: { fontSize: 13, fontWeight: '700', color: T.dark },
  tileLabelActive: { color: T.accentDark },
  tileDesc: { fontSize: 11, color: T.faint },
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
