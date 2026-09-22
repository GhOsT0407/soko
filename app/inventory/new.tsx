import { useState } from 'react'
import { StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { router } from 'expo-router'
import { SP } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'
import { Screen, Button, ModalHeader, ModalFooter, StockForm, stockRow, type StockDraft } from '@/components'

export default function NewInventoryScreen() {
  const activeBusiness = useStore((s) => s.activeBusiness)
  const session = useStore((s) => s.session)

  const [draft, setDraft] = useState<StockDraft>({
    name: '', qty: '', unit: 'pcs', costPrice: '', sellPrice: '', lowStock: '5',
  })
  const [saving, setSaving] = useState(false)

  const canSave = draft.name.trim().length > 0 && parseFloat(draft.qty) >= 0

  async function handleSave() {
    if (!canSave || !activeBusiness || !session) return
    setSaving(true)
    try {
      const { error } = await supabase.from('inventory').insert({
        business_id: activeBusiness.id,
        user_id: session.user.id,
        category: 'General',
        ...stockRow(draft),
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
        <ModalHeader title="Add stock item" />
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <StockForm value={draft} onChange={setDraft} autoFocusName />
        </ScrollView>
        <ModalFooter>
          <Button
            grow size="lg"
            onPress={handleSave}
            disabled={!canSave}
            loading={saving}
            label={canSave ? 'Add to stock' : 'Enter item name & quantity'}
          />
        </ModalFooter>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: SP.xl, gap: SP.xl },
})
