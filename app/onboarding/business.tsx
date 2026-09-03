import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { T, FONT } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'

const TYPES = [
  { id: 'trader', emoji: '🛒', label: 'Trader' },
  { id: 'shop', emoji: '🏪', label: 'Shop' },
  { id: 'food', emoji: '🍲', label: 'Food' },
  { id: 'fashion', emoji: '👗', label: 'Fashion' },
  { id: 'service', emoji: '🔧', label: 'Service' },
  { id: 'tech', emoji: '📱', label: 'Tech' },
]

export default function CreateBusinessScreen() {
  const session = useStore((s) => s.session)
  const setActiveBusiness = useStore((s) => s.setActiveBusiness)

  const [name, setName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [type, setType] = useState('trader')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!name.trim() || !session) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('businesses')
        .insert({
          user_id: session.user.id,
          name: name.trim(),
          owner_name: ownerName.trim(),
          type,
        })
        .select()
        .single()

      if (error) throw error
      setActiveBusiness(data)
      router.replace('/(tabs)')
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not create business.')
    } finally {
      setLoading(false)
    }
  }

  const ready = name.trim().length > 0

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <View style={s.logoMark}>
            <Text style={s.logoLetter}>S</Text>
          </View>
          <Text style={s.title}>Set up your business</Text>
          <Text style={s.sub}>This takes 30 seconds. You can change everything later.</Text>
        </View>

        <View style={s.fields}>
          <View style={s.field}>
            <Text style={s.label}>BUSINESS NAME</Text>
            <TextInput
              style={[s.input, name.length > 0 && s.inputActive]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Mama Chioma Provisions"
              placeholderTextColor={T.faint}
              returnKeyType="next"
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>YOUR NAME (OPTIONAL)</Text>
            <TextInput
              style={[s.input, ownerName.length > 0 && s.inputActive]}
              value={ownerName}
              onChangeText={setOwnerName}
              placeholder="e.g. Chioma Okafor"
              placeholderTextColor={T.faint}
              returnKeyType="done"
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>BUSINESS TYPE</Text>
            <View style={s.typeGrid}>
              {TYPES.map((bt) => (
                <TouchableOpacity
                  key={bt.id}
                  style={[s.typeBtn, type === bt.id && s.typeBtnActive]}
                  onPress={() => setType(bt.id)}
                  activeOpacity={0.75}
                >
                  <Text style={s.typeEmoji}>{bt.emoji}</Text>
                  <Text style={[s.typeName, type === bt.id && s.typeNameActive]}>
                    {bt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[s.btn, (!ready || loading) && s.btnDisabled]}
          onPress={handleCreate}
          disabled={!ready || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.btnText}>Start tracking →</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { padding: 24, gap: 28 },

  header: { alignItems: 'center', gap: 10, paddingTop: 12 },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: T.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoLetter: { fontSize: 28, fontWeight: '900', color: '#fff' },
  title: { fontSize: 24, fontWeight: '800', color: T.text, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: T.muted, textAlign: 'center', lineHeight: 20 },

  fields: { gap: 18 },
  field: { gap: 7 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: T.muted,
    letterSpacing: 1.5,
    fontFamily: FONT.mono,
  },
  input: {
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: T.text,
  },
  inputActive: { borderColor: T.accent },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  typeBtnActive: { borderColor: T.accent, backgroundColor: T.accentLight },
  typeEmoji: { fontSize: 16 },
  typeName: { fontSize: 13, fontWeight: '600', color: T.muted },
  typeNameActive: { color: T.accent },

  btn: {
    backgroundColor: T.accent,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
