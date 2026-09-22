import { View, StyleSheet } from 'react-native'
import { SP } from '@/constants/theme'
import { Input } from './Input'

export type StockDraft = {
  name: string
  qty: string
  unit: string
  costPrice: string
  sellPrice: string
  lowStock: string
}

type Props = {
  value: StockDraft
  onChange: (next: StockDraft) => void
  /** Focus the name field on mount — for the "new item" sheet. */
  autoFocusName?: boolean
}

// The fields behind both stock sheets (add and edit), so they can't drift.
export function StockForm({ value, onChange, autoFocusName }: Props) {
  const set = (k: keyof StockDraft) => (v: string) => onChange({ ...value, [k]: v })
  return (
    <>
      <Input
        label="Item name"
        value={value.name}
        onChangeText={set('name')}
        placeholder="e.g. Rice 50kg, Ankara fabric"
        autoFocus={autoFocusName}
      />
      <View style={s.row}>
        <Input
          label="Quantity"
          mono large
          keyboardType="numeric"
          value={value.qty}
          onChangeText={set('qty')}
          placeholder="0"
          containerStyle={s.grow2}
        />
        <Input
          label="Unit"
          value={value.unit}
          onChangeText={set('unit')}
          placeholder="pcs"
          containerStyle={s.grow}
        />
      </View>
      <View style={s.row}>
        <Input
          label="Cost price (₦)"
          mono
          keyboardType="numeric"
          value={value.costPrice}
          onChangeText={set('costPrice')}
          placeholder="Optional"
          containerStyle={s.grow}
        />
        <Input
          label="Sell price (₦)"
          mono
          keyboardType="numeric"
          value={value.sellPrice}
          onChangeText={set('sellPrice')}
          placeholder="Optional"
          containerStyle={s.grow}
        />
      </View>
      <Input
        label="Low stock alert below"
        mono
        keyboardType="numeric"
        value={value.lowStock}
        onChangeText={set('lowStock')}
        placeholder="5"
        hint="Shows on the dashboard when stock drops to this"
      />
    </>
  )
}

/** The columns the form writes, parsed for Supabase. */
export function stockRow(d: StockDraft) {
  return {
    name: d.name.trim(),
    qty: parseFloat(d.qty) || 0,
    unit: d.unit.trim() || 'pcs',
    cost_price: d.costPrice ? parseFloat(d.costPrice) : null,
    sell_price: d.sellPrice ? parseFloat(d.sellPrice) : null,
    low_stock_threshold: parseFloat(d.lowStock) || 5,
  }
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: SP.md },
  grow: { flex: 1 },
  grow2: { flex: 2 },
})
