import { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native'
import { router } from 'expo-router'
import { useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { T, FONT } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'
import type { InventoryItem } from '@/types'

function fmt(n: number | null) {
  if (n == null) return '—'
  return '₦' + n.toLocaleString()
}

const CACHE_TTL = 30_000

export default function InventoryScreen() {
  const activeBusiness = useStore((s) => s.activeBusiness)
  const setInventoryCache = useStore((s) => s.setInventoryCache)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!activeBusiness) return
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .eq('business_id', activeBusiness.id)
      .order('name')
    if (data) {
      setItems(data)
      setInventoryCache({ data, at: Date.now() })
    }
  }, [activeBusiness, setInventoryCache])

  useFocusEffect(useCallback(() => {
    const cache = useStore.getState().inventoryCache
    if (cache && Date.now() - cache.at < CACHE_TTL) {
      setItems(cache.data)
      return
    }
    load()
  }, [load]))

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const filtered = items.filter(
    (i) => query.length === 0 || i.name.toLowerCase().includes(query.toLowerCase())
  )

  const lowStockCount = items.filter((i) => i.qty <= i.low_stock_threshold).length
  const totalItems = items.length

  async function handleDelete(id: string) {
    Alert.alert('Delete item?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('inventory').delete().eq('id', id)
          setItems((prev) => prev.filter((i) => i.id !== id))
        },
      },
    ])
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Stock</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => router.push('/inventory/new')}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={s.summary}>
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>TOTAL ITEMS</Text>
          <Text style={s.summaryNum}>{totalItems}</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>LOW STOCK</Text>
          <Text style={[s.summaryNum, lowStockCount > 0 && { color: T.error }]}>{lowStockCount}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={T.faint} style={s.searchIcon} />
        <TextInput
          style={s.search}
          placeholder="Search items..."
          placeholderTextColor={T.faint}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />}
      >
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="cube-outline" size={40} color={T.faint} />
            <Text style={s.emptyTitle}>No stock items</Text>
            <Text style={s.emptyText}>Add your products to track inventory.</Text>
          </View>
        ) : (
          <View style={s.list}>
            {filtered.map((item, idx) => {
              const isLow = item.qty <= item.low_stock_threshold
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[s.row, idx === filtered.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => router.push(`/inventory/${item.id}` as any)}
                  activeOpacity={0.75}
                >
                  <View style={s.rowLeft}>
                    <Text style={s.rowName} numberOfLines={1}>{item.name}</Text>
                    <Text style={s.rowMeta}>
                      {item.category}
                      {item.sell_price ? ` · ${fmt(item.sell_price)}` : ''}
                    </Text>
                  </View>
                  <View style={s.rowRight}>
                    <View style={[s.qtyBadge, isLow && s.qtyBadgeLow]}>
                      <Text style={[s.qtyText, isLow && s.qtyTextLow]}>
                        {item.qty} {item.unit}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={15} color={T.faint} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
        <View style={{ height: 24 }} />
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
  title: { fontSize: 22, fontWeight: '800', color: T.text, letterSpacing: -0.5 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summary: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 3 },
  summaryDivider: { width: 1, backgroundColor: T.border },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: T.faint,
    letterSpacing: 1.5,
    fontFamily: FONT.mono,
  },
  summaryNum: { fontSize: 22, fontWeight: '900', color: T.text },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: T.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  search: { flex: 1, fontSize: 14, color: T.text, paddingVertical: 10 },

  empty: { padding: 48, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: T.text },
  emptyText: { fontSize: 13, color: T.muted, textAlign: 'center' },

  list: {
    marginHorizontal: 20,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    gap: 10,
  },
  rowLeft: { flex: 1, gap: 3 },
  rowName: { fontSize: 14, fontWeight: '600', color: T.text },
  rowMeta: { fontSize: 12, color: T.muted },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBadge: {
    backgroundColor: T.greenLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  qtyBadgeLow: { backgroundColor: T.errorLight },
  qtyText: { fontSize: 12, fontWeight: '700', color: T.green, fontFamily: FONT.mono },
  qtyTextLow: { color: T.error },
})
