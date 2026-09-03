import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { T, FONT } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'

export default function NewDebtScreen() {
  const activeBusiness = useStore((s) => s.activeBusiness)
  const session = useStore((s) => s.session)

  const [customer, setCustomer] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const canSave = customer.trim().length > 0 && parseFloat(amount) > 0

  async function handleSave() {
    if (!canSave || !activeBusiness || !session) return
    setSaving(true)
    try {
      const { error } = await supabase.from('debts').insert({
        business_id: activeBusiness.id,
        user_id: session.user.id,
        customer: customer.trim(),
        phone: phone.trim(),
        amount: parseFloat(amount),
        amount_paid: 0,
        description: description.trim(),
      })
      if (error) throw error
      useStore.getState().clearCache()
      router.back()
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={22} color={T.muted} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Add Debt</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.field}>
            <Text style={s.label}>CUSTOMER NAME</Text>
            <TextInput
              style={[s.input, customer.length > 0 && s.inputActive]}
              value={customer}
              onChangeText={setCustomer}
              placeholder="e.g. Iya Tunde"
              placeholderTextColor={T.faint}
              autoFocus
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>PHONE (OPTIONAL)</Text>
            <TextInput
              style={[s.input, phone.length > 0 && s.inputActive]}
              value={phone}
              onChangeText={setPhone}
              placeholder="08012345678"
              placeholderTextColor={T.faint}
              keyboardType="phone-pad"
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>AMOUNT OWED (₦)</Text>
            <TextInput
              style={[s.input, amount.length > 0 && s.inputActive]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={T.faint}
              keyboardType="numeric"
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput
              style={[s.input, description.length > 0 && s.inputActive]}
              value={description}
              onChangeText={setDescription}
              placeholder="What was sold / what for?"
              placeholderTextColor={T.faint}
            />
          </View>
        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity
            style={[s.saveBtn, (!canSave || saving) && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave || saving}
            activeOpacity={0.85}
          >
            <Text style={s.saveBtnText}>
              {saving ? 'Saving...' : canSave ? `Add Debt — ₦${parseFloat(amount || '0').toLocaleString()}` : 'Enter customer & amount'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  scroll: { padding: 20, gap: 18 },
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
  footer: { padding: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: T.border },
  saveBtn: {
    backgroundColor: T.accent,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: T.border },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
