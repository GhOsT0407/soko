import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { T, FONT } from '@/constants/theme'
import { useStore } from '@/store'

export default function NameScreen() {
  const updateProfile = useStore((s) => s.updateProfile)
  const saved = useStore((s) => s.profile)
  const [businessName, setBusinessName] = useState(saved.businessName)
  const [ownerName, setOwnerName] = useState(saved.ownerName)

  const canContinue = businessName.trim().length > 0

  function onContinue() {
    if (!canContinue) return
    updateProfile({ businessName: businessName.trim(), ownerName: ownerName.trim() })
    router.push('/onboarding/type')
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <ProgressBar step={1} />

          <Text style={s.label}>STEP 1 OF 3</Text>
          <Text style={s.title}>What's your{'\n'}business called?</Text>
          <Text style={s.sub}>We'll personalise Soko around your business.</Text>

          <View style={s.inputs}>
            <TextInput
              style={[s.input, businessName.length > 0 && s.inputFilled]}
              placeholder="e.g. Mama Chioma Fabrics"
              placeholderTextColor={T.faint}
              value={businessName}
              onChangeText={setBusinessName}
              returnKeyType="next"
              autoFocus
            />
            <TextInput
              style={[s.input, ownerName.length > 0 && s.inputFilled]}
              placeholder="Owner's name (optional)"
              placeholderTextColor={T.faint}
              value={ownerName}
              onChangeText={setOwnerName}
              returnKeyType="done"
              onSubmitEditing={onContinue}
            />
          </View>

          <TouchableOpacity
            style={[s.cta, !canContinue && s.ctaDisabled]}
            onPress={onContinue}
            activeOpacity={0.85}
          >
            <Text style={[s.ctaText, !canContinue && s.ctaTextDisabled]}>
              {canContinue ? `Continue as "${businessName.trim()}"` : 'Enter your business name'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function ProgressBar({ step }: { step: number }) {
  return (
    <View style={s.progress}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={[s.progressDot, i <= step && s.progressDotActive]}
        />
      ))}
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { flexGrow: 1, padding: 26, paddingTop: 20, gap: 16 },
  progress: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  progressDot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: T.border },
  progressDotActive: { backgroundColor: T.accent },
  label: {
    fontSize: 10,
    color: T.accent,
    fontFamily: FONT.mono,
    letterSpacing: 2,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: T.dark,
    letterSpacing: -0.5,
    fontFamily: FONT.serif,
    lineHeight: 36,
  },
  sub: { fontSize: 14, color: T.muted, lineHeight: 20, marginTop: -4 },
  inputs: { gap: 12, marginTop: 8 },
  input: {
    backgroundColor: T.surface,
    borderWidth: 2,
    borderColor: T.border,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: T.text,
  },
  inputFilled: { borderColor: T.accent },
  cta: {
    backgroundColor: T.accent,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaDisabled: { backgroundColor: T.border },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ctaTextDisabled: { color: T.muted },
})
