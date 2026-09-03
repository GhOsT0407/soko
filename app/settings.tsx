import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { T, FONT } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'
import type { Business } from '@/types'

const TYPES = [
  { id: 'trader', emoji: '🛒', label: 'Trader' },
  { id: 'shop', emoji: '🏪', label: 'Shop' },
  { id: 'food', emoji: '🍲', label: 'Food' },
  { id: 'fashion', emoji: '👗', label: 'Fashion' },
  { id: 'service', emoji: '🔧', label: 'Service' },
  { id: 'tech', emoji: '📱', label: 'Tech' },
]

export default function SettingsScreen() {
  const activeBusiness = useStore((s) => s.activeBusiness)
  const setActiveBusiness = useStore((s) => s.setActiveBusiness)
  const businesses = useStore((s) => s.businesses)
  const setBusinesses = useStore((s) => s.setBusinesses)
  const apiKey = useStore((s) => s.apiKey)
  const setApiKey = useStore((s) => s.setApiKey)
  const session = useStore((s) => s.session)

  const [name, setName] = useState(activeBusiness?.name || '')
  const [ownerName, setOwnerName] = useState(activeBusiness?.owner_name || '')
  const [type, setType] = useState(activeBusiness?.type || 'trader')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!session) return
    supabase
      .from('businesses')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at')
      .then(({ data }) => { if (data) setBusinesses(data) })
  }, [session])

  function switchBusiness(biz: Business) {
    if (biz.id === activeBusiness?.id) return
    setActiveBusiness(biz)
    useStore.getState().clearCache()
    setName(biz.name)
    setOwnerName(biz.owner_name)
    setType(biz.type)
    setDirty(false)
  }

  function markDirty() { if (!dirty) setDirty(true) }

  async function handleSave() {
    if (!activeBusiness) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('businesses')
        .update({ name: name.trim(), owner_name: ownerName.trim(), type })
        .eq('id', activeBusiness.id)
        .select()
        .single()
      if (error) throw error
      setActiveBusiness(data)
      setDirty(false)
      Alert.alert('Saved', 'Business profile updated.')
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
          setActiveBusiness(null)
          router.replace('/auth')
        },
      },
    ])
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={T.muted} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.section}>
          <Text style={s.sectionTitle}>BUSINESS PROFILE</Text>

          <View style={s.field}>
            <Text style={s.label}>BUSINESS NAME</Text>
            <TextInput
              style={[s.input, name.length > 0 && s.inputActive]}
              value={name}
              onChangeText={(v) => { setName(v); markDirty() }}
              placeholder="Business name"
              placeholderTextColor={T.faint}
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>OWNER NAME</Text>
            <TextInput
              style={[s.input, ownerName.length > 0 && s.inputActive]}
              value={ownerName}
              onChangeText={(v) => { setOwnerName(v); markDirty() }}
              placeholder="Your name"
              placeholderTextColor={T.faint}
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>BUSINESS TYPE</Text>
            <View style={s.typeGrid}>
              {TYPES.map((bt) => (
                <TouchableOpacity
                  key={bt.id}
                  style={[s.typeBtn, type === bt.id && s.typeBtnActive]}
                  onPress={() => { setType(bt.id); markDirty() }}
                  activeOpacity={0.75}
                >
                  <Text style={s.typeEmoji}>{bt.emoji}</Text>
                  <Text style={[s.typeName, type === bt.id && s.typeNameActive]}>{bt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {dirty && (
            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {businesses.length > 1 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>MY BUSINESSES</Text>
            {businesses.map((biz) => {
              const active = biz.id === activeBusiness?.id
              return (
                <TouchableOpacity
                  key={biz.id}
                  style={[s.bizRow, active && s.bizRowActive]}
                  onPress={() => switchBusiness(biz)}
                  activeOpacity={0.75}
                >
                  <View style={[s.bizDot, active && s.bizDotActive]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.bizName, active && { color: T.accent }]}>{biz.name}</Text>
                    <Text style={s.bizType}>{biz.type}</Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={18} color={T.accent} />}
                </TouchableOpacity>
              )
            })}
            <TouchableOpacity
              style={s.addBizBtn}
              onPress={() => router.push('/onboarding/business' as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={16} color={T.accent} />
              <Text style={s.addBizText}>Add another business</Text>
            </TouchableOpacity>
          </View>
        )}

        {businesses.length <= 1 && (
          <TouchableOpacity
            style={s.addBizBtnStandalone}
            onPress={() => router.push('/onboarding/business' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={16} color={T.accent} />
            <Text style={s.addBizText}>Add another business</Text>
          </TouchableOpacity>
        )}

        <View style={s.section}>
          <Text style={s.sectionTitle}>ACCOUNT</Text>
          <View style={s.infoRow}>
            <Ionicons name="person-circle-outline" size={18} color={T.muted} />
            <Text style={s.infoText} numberOfLines={1}>{session?.user.email}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>AI ASSISTANT</Text>
          <View style={s.infoRow}>
            <Ionicons name="sparkles" size={16} color={apiKey ? T.green : T.faint} />
            <View style={{ flex: 1 }}>
              <Text style={s.infoTitle}>{apiKey ? 'Connected' : 'Not connected'}</Text>
              {apiKey && <Text style={s.infoSub}>Key: ••••{apiKey.slice(-6)}</Text>}
            </View>
            {apiKey ? (
              <TouchableOpacity
                style={s.smallDangerBtn}
                onPress={() =>
                  Alert.alert('Remove API Key', 'Disconnect the AI assistant?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => setApiKey('') },
                  ])
                }
              >
                <Text style={s.smallDangerBtnText}>Remove</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.smallAccentBtn} onPress={() => router.navigate('/(tabs)/ai')}>
                <Text style={s.smallAccentBtnText}>Set up</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={T.error} />
          <Text style={s.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <View style={s.appInfo}>
          <Text style={s.appInfoText}>Soko · Your business, in your pocket.</Text>
          <Text style={s.appInfoVersion}>v2.0.0</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: T.text },
  scroll: { padding: 20, gap: 16 },

  section: {
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: T.muted,
    letterSpacing: 2,
    fontFamily: FONT.mono,
  },
  field: { gap: 7 },
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
    paddingVertical: 12,
    fontSize: 15,
    color: T.text,
  },
  inputActive: { borderColor: T.accent },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: T.bg,
  },
  typeBtnActive: { borderColor: T.accent, backgroundColor: T.accentLight },
  typeEmoji: { fontSize: 15 },
  typeName: { fontSize: 13, fontWeight: '600', color: T.muted },
  typeNameActive: { color: T.accent },
  saveBtn: {
    backgroundColor: T.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: T.bg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: T.border,
  },
  infoText: { flex: 1, fontSize: 14, color: T.text },
  infoTitle: { fontSize: 14, fontWeight: '600', color: T.text },
  infoSub: { fontSize: 11, color: T.muted, fontFamily: FONT.mono, marginTop: 2 },

  smallAccentBtn: {
    backgroundColor: T.accentLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  smallAccentBtnText: { color: T.accent, fontWeight: '700', fontSize: 12 },
  smallDangerBtn: {
    backgroundColor: T.errorLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  smallDangerBtnText: { color: T.error, fontWeight: '700', fontSize: 12 },

  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: T.errorLight,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: T.error + '33',
  },
  signOutText: { color: T.error, fontWeight: '700', fontSize: 15 },

  appInfo: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  appInfoText: { fontSize: 12, color: T.faint },
  appInfoVersion: { fontSize: 10, color: T.faint, fontFamily: FONT.mono },

  bizRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: T.bg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: T.border,
  },
  bizRowActive: { borderColor: T.accent, backgroundColor: T.accentLight },
  bizDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.border },
  bizDotActive: { backgroundColor: T.accent },
  bizName: { fontSize: 14, fontWeight: '600', color: T.text },
  bizType: { fontSize: 11, color: T.muted, marginTop: 2 },
  addBizBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  addBizBtnStandalone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  addBizText: { fontSize: 13, color: T.accent, fontWeight: '600' },
})
