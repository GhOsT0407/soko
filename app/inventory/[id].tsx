import { useState, useEffect } from 'react'
import { StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { T, SP } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'
import {
  Screen, Button, IconButton, EmptyState, ModalHeader, ModalFooter, StockForm, stockRow, type StockDraft,
} from '@/components'

export default function EditInventoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const [draft, setDraft] = useState<StockDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('inventory').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        setDraft({
          name: data.name,
          qty: String(data.qty),
          unit: data.unit,
          costPrice: data.cost_price != null ? String(data.cost_price) : '',
          sellPrice: data.sell_price != null ? String(data.sell_price) : '',
          lowStock: String(data.low_stock_threshold),
        })
      }
      setLoading(false)
    })
  }, [id])

  async function handleSave() {
    if (!draft || !draft.name.trim()) return
    setSaving(true)
    try {
      const { error } = await supabase.from('inventory').update(stockRow(draft)).eq('id', id)
      if (error) throw error
      useStore.getState().clearCache()
      router.back()
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleDelete() {
    Alert.alert('Delete item?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('inventory').delete().eq('id', id)
          useStore.getState().clearCache()
          router.back()
        },
      },
    ])
  }

  if (loading) {
    return (
      <Screen>
        <ModalHeader title="Edit item" />
        <ActivityIndicator style={s.spinner} color={T.accent} />
      </Screen>
    )
  }

  if (!draft) {
    return (
      <Screen>
        <ModalHeader title="Edit item" />
        <EmptyState icon="search-outline" title="Item not found" body="It may have been deleted." />
      </Screen>
    )
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ModalHeader
          title="Edit item"
          right={<IconButton icon="trash-outline" size={36} color={T.error} onPress={handleDelete} accessibilityLabel="Delete item" />}
        />
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <StockForm value={draft} onChange={setDraft} />
        </ScrollView>
        <ModalFooter>
          <Button grow size="lg" onPress={handleSave} disabled={!draft.name.trim()} loading={saving} label="Save changes" />
        </ModalFooter>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  spinner: { marginTop: 40 },
  scroll: { padding: SP.xl, gap: SP.xl },
})
