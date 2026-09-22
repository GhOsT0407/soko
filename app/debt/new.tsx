import { useState } from 'react'
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { router } from 'expo-router'
import { SP } from '@/constants/theme'
import { naira } from '@/lib/format'
import { dueDateFromDays } from '@/lib/debts'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'
import { Screen, Txt, Button, Input, Chip, ModalHeader, ModalFooter } from '@/components'

// Terms the trader can pick with one tap; `custom` reveals a days field.
type Terms = 'none' | '7' | '14' | '30' | 'custom'
const TERMS: { key: Terms; label: string }[] = [
  { key: 'none', label: 'No date' },
  { key: '7', label: '1 week' },
  { key: '14', label: '2 weeks' },
  { key: '30', label: '1 month' },
  { key: 'custom', label: 'Other' },
]

export default function NewDebtScreen() {
  const activeBusiness = useStore((s) => s.activeBusiness)
  const session = useStore((s) => s.session)

  const [customer, setCustomer] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [terms, setTerms] = useState<Terms>('none')
  const [customDays, setCustomDays] = useState('')
  const [saving, setSaving] = useState(false)

  const canSave = customer.trim().length > 0 && parseFloat(amount) > 0

  const dueDays =
    terms === 'none' ? null
    : terms === 'custom' ? (parseInt(customDays) > 0 ? parseInt(customDays) : null)
    : parseInt(terms)
  const dueDate = dueDays != null ? dueDateFromDays(dueDays) : null
  const dueText = dueDate
    ? new Date(dueDate + 'T00:00:00').toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })
    : 'Counts as overdue after a week'

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
        due_date: dueDate,
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
    <Screen>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ModalHeader title="Add debt" />

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Input
            label="Customer name"
            value={customer}
            onChangeText={setCustomer}
            placeholder="e.g. Iya Tunde"
            autoFocus
          />
          <Input
            label="Phone (optional)"
            mono
            value={phone}
            onChangeText={setPhone}
            placeholder="08012345678"
            keyboardType="phone-pad"
            hint="Lets you send a WhatsApp reminder later"
          />
          <Input
            label="Amount owed (₦)"
            mono large
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            keyboardType="numeric"
          />
          <Input
            label="What for (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="What was sold / what for?"
          />

          <View style={s.gapSm}>
            <Txt variant="label">Due</Txt>
            <View style={s.chips}>
              {TERMS.map((t) => (
                <Chip key={t.key} label={t.label} selected={terms === t.key} onPress={() => setTerms(t.key)} />
              ))}
            </View>
            {terms === 'custom' ? (
              <Input
                mono
                keyboardType="numeric"
                value={customDays}
                onChangeText={setCustomDays}
                placeholder="Days from today, e.g. 10"
              />
            ) : null}
            <Txt variant="meta">{dueText}</Txt>
          </View>
        </ScrollView>

        <ModalFooter>
          <Button
            grow
            size="lg"
            onPress={handleSave}
            disabled={!canSave}
            loading={saving}
            label={canSave ? `Add debt  ${naira(parseFloat(amount))}` : 'Enter customer & amount'}
          />
        </ModalFooter>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: SP.xl, gap: SP.xl },
  gapSm: { gap: SP.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm },
})
