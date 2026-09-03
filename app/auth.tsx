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
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { T, FONT } from '@/constants/theme'
import { supabase } from '@/lib/supabase'

export default function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    const e = email.trim().toLowerCase()
    const p = password.trim()
    if (!e || !p) return
    if (p.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email: e, password: p })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: e, password: p })
        if (error) throw error
      }
    } catch (err: any) {
      const msg: string = err.message || 'Something went wrong.'
      const waitMatch = msg.match(/after (\d+) seconds/)
      if (waitMatch) {
        Alert.alert('Too many attempts', `Please wait ${waitMatch[1]} seconds before trying again.`)
      } else if (msg.toLowerCase().includes('invalid login')) {
        Alert.alert('Wrong email or password', 'Double-check and try again.')
      } else if (msg.toLowerCase().includes('already registered')) {
        Alert.alert('Account exists', 'An account with this email already exists. Try signing in instead.')
      } else {
        Alert.alert('Error', msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const ready = email.trim().length > 0 && password.trim().length >= 6

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={s.logoWrap}>
            <View style={s.logoMark}>
              <Text style={s.logoLetter}>S</Text>
            </View>
            <Text style={s.logoName}>Soko</Text>
            <Text style={s.logoTagline}>Your business, in your pocket.</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>
              {mode === 'signin' ? 'Welcome back' : 'Create account'}
            </Text>
            <Text style={s.cardSub}>
              {mode === 'signin'
                ? 'Sign in to manage your business'
                : 'Start tracking your business today'}
            </Text>

            <View style={s.fields}>
              <View style={s.field}>
                <Text style={s.label}>EMAIL</Text>
                <TextInput
                  style={[s.input, email.length > 0 && s.inputActive]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={T.faint}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

              <View style={s.field}>
                <Text style={s.label}>PASSWORD</Text>
                <TextInput
                  style={[s.input, password.length > 0 && s.inputActive]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="6+ characters"
                  placeholderTextColor={T.faint}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[s.btn, (!ready || loading) && s.btnDisabled]}
              onPress={handleSubmit}
              disabled={!ready || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.btnText}>
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.switchRow}
              onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            >
              <Text style={s.switchText}>
                {mode === 'signin'
                  ? "Don't have an account? "
                  : 'Already have an account? '}
                <Text style={s.switchLink}>
                  {mode === 'signin' ? 'Create one' : 'Sign in'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 32 },

  logoWrap: { alignItems: 'center', gap: 10 },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: T.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: { fontSize: 32, fontWeight: '900', color: '#fff' },
  logoName: { fontSize: 28, fontWeight: '900', color: T.text, letterSpacing: -1 },
  logoTagline: { fontSize: 14, color: T.muted, textAlign: 'center' },

  card: {
    backgroundColor: T.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    padding: 24,
    gap: 20,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: T.text, letterSpacing: -0.5 },
  cardSub: { fontSize: 14, color: T.muted, marginTop: -10 },

  fields: { gap: 14 },
  field: { gap: 6 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: T.muted,
    letterSpacing: 1.5,
    fontFamily: FONT.mono,
  },
  input: {
    backgroundColor: T.bg,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: T.text,
  },
  inputActive: { borderColor: T.accent },

  btn: {
    backgroundColor: T.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  switchRow: { alignItems: 'center' },
  switchText: { fontSize: 13, color: T.muted },
  switchLink: { color: T.accent, fontWeight: '700' },
})
