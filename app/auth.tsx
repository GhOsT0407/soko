import { useState } from 'react'
import {
  View,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native'
import { T, FONT, SP } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { Screen, Txt, Card, Button, Input, Avatar } from '@/components'

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
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Wordmark */}
          <View style={s.brand}>
            <Avatar name="Soko" size={64} />
            <Txt variant="display" style={s.name}>Soko</Txt>
            <Txt variant="note" align="center">Your business, in your pocket.</Txt>
          </View>

          <Card style={s.card}>
            <View style={s.gapXs}>
              <Txt variant="title">{mode === 'signin' ? 'Welcome back' : 'Create account'}</Txt>
              <Txt variant="meta">
                {mode === 'signin'
                  ? 'Sign in to open your ledger'
                  : 'Start keeping your books today'}
              </Txt>
            </View>

            <View style={s.gapMd}>
              <Input
                label="Email"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="next"
              />
              <Input
                label="Password"
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                placeholder="6+ characters"
                secureTextEntry
                autoComplete={mode === 'signin' ? 'password' : 'new-password'}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>

            <Button
              size="lg"
              onPress={handleSubmit}
              disabled={!ready}
              loading={loading}
              label={mode === 'signin' ? 'Sign in' : 'Create account'}
            />

            <Pressable
              onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              accessibilityRole="link"
              hitSlop={8}
              style={s.switch}
            >
              <Txt variant="meta">
                {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <Txt style={s.link}>{mode === 'signin' ? 'Create one' : 'Sign in'}</Txt>
              </Txt>
            </Pressable>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: SP.xl, gap: SP.xxl },
  brand: { alignItems: 'center', gap: SP.sm },
  name: { marginTop: SP.xs },
  card: { padding: SP.xl, gap: SP.xl },
  gapXs: { gap: SP.xs },
  gapMd: { gap: SP.md },
  switch: { alignItems: 'center' },
  link: { fontFamily: FONT.sansBold, fontSize: 12, lineHeight: 16, color: T.accent },
})
