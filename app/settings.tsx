import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { T, FONT } from '@/constants/theme'
import { useStore } from '@/store'
import { BUSINESS_TYPES } from '@/constants/data'
import type { BusinessTypeId } from '@/constants/data'

export default function SettingsScreen() {
  const profile = useStore((s) => s.profile)
  const updateProfile = useStore((s) => s.updateProfile)
  const setApiKey = useStore((s) => s.setApiKey)
  const apiKey = useStore((s) => s.apiKey)
  const setOnboarded = useStore((s) => s.setOnboarded)

  const salesCount = useStore((s) => s.sales.length)
  const inventoryCount = useStore((s) => s.inventory.length)
  const debtsCount = useStore((s) => s.debts.length)

  const [businessName, setBusinessName] = useState(profile.businessName)
  const [ownerName, setOwnerName] = useState(profile.ownerName)
  const [selectedType, setSelectedType] = useState(profile.businessType)
  const [dirty, setDirty] = useState(false)

  function markDirty() {
    if (!dirty) setDirty(true)
  }

  function handleSave() {
    updateProfile({ businessName, ownerName, businessType: selectedType })
    setDirty(false)
    Alert.alert('Saved', 'Your profile has been updated.')
  }

  function handleClearApiKey() {
    Alert.alert(
      'Disconnect AI',
      'This will remove your API key from the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: () => setApiKey('') },
      ]
    )
  }

  function handleClearData() {
    Alert.alert(
      '⚠ Clear All Data',
      `This will permanently delete all ${salesCount} sales, ${inventoryCount} inventory items, and ${debtsCount} debt records. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            useStore.setState({ sales: [], inventory: [], debts: [] })
            Alert.alert('Cleared', 'All data has been deleted.')
          },
        },
      ]
    )
  }

  function handleResetOnboarding() {
    Alert.alert(
      'Reset Setup',
      'This will take you back to the onboarding screens.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setOnboarded(false)
            router.replace('/onboarding')
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerOrb} />
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
        <Text style={s.headerSub}>Manage your business profile</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Stats summary */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Ionicons name="cash-outline" size={18} color={T.accent} />
            <Text style={s.statNum}>{salesCount}</Text>
            <Text style={s.statLabel}>Sales</Text>
          </View>
          <View style={s.statCard}>
            <Ionicons name="cube-outline" size={18} color={T.green} />
            <Text style={[s.statNum, { color: T.green }]}>{inventoryCount}</Text>
            <Text style={s.statLabel}>Items</Text>
          </View>
          <View style={s.statCard}>
            <Ionicons name="people-outline" size={18} color={T.warning} />
            <Text style={[s.statNum, { color: T.warning }]}>{debtsCount}</Text>
            <Text style={s.statLabel}>Debts</Text>
          </View>
        </View>

        {/* Business profile */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>BUSINESS PROFILE</Text>

          <View style={s.field}>
            <Text style={s.fieldLabel}>BUSINESS NAME</Text>
            <TextInput
              style={[s.input, businessName.length > 0 && s.inputFilled]}
              value={businessName}
              onChangeText={(v) => { setBusinessName(v); markDirty() }}
              placeholder="Your business name"
              placeholderTextColor={T.faint}
            />
          </View>

          <View style={s.field}>
            <Text style={s.fieldLabel}>OWNER NAME</Text>
            <TextInput
              style={[s.input, ownerName.length > 0 && s.inputFilled]}
              value={ownerName}
              onChangeText={(v) => { setOwnerName(v); markDirty() }}
              placeholder="Your name"
              placeholderTextColor={T.faint}
            />
          </View>

          <View style={s.field}>
            <Text style={s.fieldLabel}>BUSINESS TYPE</Text>
            <View style={s.typeGrid}>
              {BUSINESS_TYPES.map((bt) => (
                <TouchableOpacity
                  key={bt.id}
                  style={[s.typeBtn, selectedType === bt.id && s.typeBtnActive]}
                  onPress={() => { setSelectedType(bt.id as BusinessTypeId); markDirty() }}
                  activeOpacity={0.8}
                >
                  <Text style={s.typeEmoji}>{bt.emoji}</Text>
                  <Text style={[s.typeName, selectedType === bt.id && s.typeNameActive]}>
                    {bt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {dirty && (
            <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={s.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* AI section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>AI ASSISTANT</Text>
          <View style={s.infoRow}>
            <Ionicons name="sparkles" size={16} color={apiKey ? T.green : T.faint} />
            <View style={s.infoText}>
              <Text style={s.infoTitle}>{apiKey ? 'Connected' : 'Not connected'}</Text>
              <Text style={s.infoSub}>
                {apiKey
                  ? `Key: ••••${apiKey.slice(-6)}`
                  : 'Go to the AI tab to add your Gemini API key'}
              </Text>
            </View>
            {apiKey ? (
              <TouchableOpacity style={s.dangerSmallBtn} onPress={handleClearApiKey}>
                <Text style={s.dangerSmallBtnText}>Remove</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={s.accentSmallBtn}
                onPress={() => { router.back(); setTimeout(() => router.navigate('/(tabs)/ai'), 100) }}
              >
                <Text style={s.accentSmallBtnText}>Set up</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Danger zone */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: T.error }]}>DANGER ZONE</Text>

          <TouchableOpacity style={s.dangerRow} onPress={handleResetOnboarding} activeOpacity={0.8}>
            <View style={s.dangerLeft}>
              <Ionicons name="refresh-outline" size={18} color={T.warning} />
              <View>
                <Text style={s.dangerTitle}>Re-run Setup</Text>
                <Text style={s.dangerSub}>Redo the business type onboarding</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={T.faint} />
          </TouchableOpacity>

          <TouchableOpacity style={[s.dangerRow, s.dangerRowRed]} onPress={handleClearData} activeOpacity={0.8}>
            <View style={s.dangerLeft}>
              <Ionicons name="trash-outline" size={18} color={T.error} />
              <View>
                <Text style={[s.dangerTitle, { color: T.error }]}>Clear All Data</Text>
                <Text style={s.dangerSub}>
                  Delete all {salesCount} sales, {inventoryCount} items, {debtsCount} debts
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={T.error} />
          </TouchableOpacity>
        </View>

        {/* App info */}
        <View style={s.appInfo}>
          <Text style={s.appInfoText}>Soko · Built for Nigerian small businesses</Text>
          <Text style={s.appInfoVersion}>v1.0.0</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: {
    backgroundColor: T.dark,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 22,
    overflow: 'hidden',
    position: 'relative',
    gap: 4,
  },
  headerOrb: {
    position: 'absolute',
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: T.accentMid, opacity: 0.1,
    top: -50, right: -40,
  },
  backBtn: { marginBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: FONT.mono },

  scroll: { padding: 16, gap: 16 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  statNum: { fontSize: 22, fontWeight: '900', color: T.accent, letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: T.muted, fontFamily: FONT.mono },

  section: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: T.muted,
    fontFamily: FONT.mono,
    letterSpacing: 2,
  },

  field: { gap: 8 },
  fieldLabel: { fontSize: 9, color: T.muted, fontFamily: FONT.mono, letterSpacing: 1.5 },
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
  inputFilled: { borderColor: T.accentMid },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: T.bg,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typeBtnActive: { backgroundColor: T.accentLight, borderColor: T.accent },
  typeEmoji: { fontSize: 16 },
  typeName: { fontSize: 13, fontWeight: '600', color: T.muted },
  typeNameActive: { color: T.accent },

  saveBtn: {
    backgroundColor: T.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: T.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: T.bg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: T.border,
  },
  infoText: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: T.text },
  infoSub: { fontSize: 11, color: T.muted, fontFamily: FONT.mono, marginTop: 2 },

  accentSmallBtn: {
    backgroundColor: T.accentLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  accentSmallBtnText: { color: T.accent, fontWeight: '700', fontSize: 12 },
  dangerSmallBtn: {
    backgroundColor: T.errorLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  dangerSmallBtnText: { color: T.error, fontWeight: '700', fontSize: 12 },

  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: T.warningLight,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  dangerRowRed: {
    backgroundColor: T.errorLight,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  dangerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  dangerTitle: { fontSize: 14, fontWeight: '700', color: T.text },
  dangerSub: { fontSize: 11, color: T.muted, marginTop: 2 },

  appInfo: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  appInfoText: { fontSize: 12, color: T.faint },
  appInfoVersion: { fontSize: 10, color: T.faint, fontFamily: FONT.mono },
})
