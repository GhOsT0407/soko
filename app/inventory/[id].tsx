import { useState, useEffect } from 'react'
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
  ActivityIndicator,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { T, FONT } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'
import type { InventoryItem } from '@/types'

export default function EditInventoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const [item, setItem] = useState<InventoryItem | null>(null)
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')
  const [unit, setUnit] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [lowStock, setLowStock] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('inventory').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        setItem(data)
        setName(data.name)
        setQty(String(data.qty))
        setUnit(data.unit)
        setCostPrice(data.cost_price != null ? String(data.cost_price) : '')
        setSellPrice(data.sell_price != null ? String(data.sell_price) : '')
        setLowStock(String(data.low_stock_threshold))
      }
      setLoading(false)
    })
  }, [id])

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const { error } = await supabase.from('inventory').update({
        name: name.trim(),
        qty: parseFloat(qty) || 0,
        unit: unit.trim() || 'pcs',
        cost_price: costPrice ? parseFloat(costPrice) : null,
        sell_price: sellPrice ? parseFloat(sellPrice) : null,
        low_stock_threshold: parseFloat(lowStock) || 5,
      }).eq('id', id)
      if (error) throw error
      useStore.getState().clearCache()
      router.back()
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
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
      <SafeAreaView style={s.container}>
        <ActivityIndicator style={{ marginTop: 40 }} color={T.accent} />
      </SafeAreaView>
    )
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
          <Text style={s.headerTitle}>Edit Item</Text>
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={T.error} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.field}>
            <Text style={s.label}>ITEM NAME</Text>
            <TextInput
              style={[s.input, name.length > 0 && s.inputActive]}
              value={name}
              onChangeText={setName}
              placeholderTextColor={T.faint}
            />
          </View>

          <View style={s.row}>
            <View style={[s.field, { flex: 2 }]}>
              <Text style={s.label}>QUANTITY</Text>
              <TextInput
                style={[s.input, qty.length > 0 && s.inputActive]}
                keyboardType="numeric"
                value={qty}
                onChangeText={setQty}
                placeholderTextColor={T.faint}
              />
            </View>
            <View style={[s.field, { flex: 1 }]}>
              <Text style={s.label}>UNIT</Text>
              <TextInput
                style={[s.input, unit.length > 0 && s.inputActive]}
                value={unit}
                onChangeText={setUnit}
                placeholderTextColor={T.faint}
              />
            </View>
          </View>

          <View style={s.row}>
            <View style={[s.field, { flex: 1 }]}>
              <Text style={s.label}>COST PRICE (₦)</Text>
              <TextInput
                style={[s.input, costPrice.length > 0 && s.inputActive]}
                keyboardType="numeric"
                value={costPrice}
                onChangeText={setCostPrice}
                placeholder="Optional"
                placeholderTextColor={T.faint}
              />
            </View>
            <View style={[s.field, { flex: 1 }]}>
              <Text style={s.label}>SELL PRICE (₦)</Text>
              <TextInput
                style={[s.input, sellPrice.length > 0 && s.inputActive]}
                keyboardType="numeric"
                value={sellPrice}
                onChangeText={setSellPrice}
                placeholder="Optional"
                placeholderTextColor={T.faint}
              />
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>LOW STOCK ALERT BELOW</Text>
            <TextInput
              style={[s.input, s.inputActive]}
              keyboardType="numeric"
              value={lowStock}
              onChangeText={setLowStock}
              placeholderTextColor={T.faint}
            />
          </View>
        </ScrollView>

        <View style={s.footer}>
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
  row: { flexDirection: 'row', gap: 12 },
  footer: { padding: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: T.border },
  saveBtn: {
    backgroundColor: T.accent,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
