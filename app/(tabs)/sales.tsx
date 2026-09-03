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
  Share,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { T, FONT } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'
import type { Sale } from '@/types'

type Filter = 'today' | 'week' | 'month' | 'all'

function fmt(n: number) { return '₦' + n.toLocaleString() }

function inRange(dateStr: string, filter: Filter) {
  const d = new Date(dateStr)
  const now = new Date()
  if (filter === 'today') return d.toDateString() === now.toDateString()
  if (filter === 'week') {
    const week = new Date(now); week.setDate(now.getDate() - 7)
    return d >= week
  }
  if (filter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  return true
}

const CACHE_TTL = 30_000

export default function SalesScreen() {
  const activeBusiness = useStore((s) => s.activeBusiness)
  const setSalesCache = useStore((s) => s.setSalesCache)
  const [sales, setSales] = useState<Sale[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('today')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!activeBusiness) return
    const { data } = await supabase
      .from('sales')
      .select('*')
      .eq('business_id', activeBusiness.id)
      .order('created_at', { ascending: false })
    if (data) {
      setSales(data)
      setSalesCache({ data, at: Date.now() })
    }
  }, [activeBusiness, setSalesCache])

  useFocusEffect(useCallback(() => {
    const cache = useStore.getState().salesCache
    if (cache && Date.now() - cache.at < CACHE_TTL) {
      setSales(cache.data)
      return
    }
    load()
  }, [load]))

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const filtered = sales
    .filter((s) => inRange(s.created_at, filter))
    .filter((s) =>
      query.length === 0 ||
      s.item.toLowerCase().includes(query.toLowerCase()) ||
      s.customer.toLowerCase().includes(query.toLowerCase())
    )

  const total = filtered.reduce((sum, s) => sum + s.total, 0)
  const cashTotal = filtered.filter((s) => !s.is_debt).reduce((sum, s) => sum + s.total, 0)

  async function handleExport() {
    if (filtered.length === 0) return
    const header = 'Date,Item,Category,Customer,Total,Type'
    const rows = filtered.map((s) => [
      new Date(s.created_at).toLocaleDateString('en-NG'),
      `"${s.item.replace(/"/g, '""')}"`,
      s.category,
      `"${(s.customer || '').replace(/"/g, '""')}"`,
      s.total,
      s.is_debt ? 'Credit' : 'Cash',
    ].join(','))
    const csv = [header, ...rows].join('\n')
    try {
      await Share.share({ message: csv, title: `${activeBusiness?.name} — Sales` })
    } catch {}
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete sale?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('sales').delete().eq('id', id)
          setSales((prev) => prev.filter((s) => s.id !== id))
        },
      },
    ])
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'all', label: 'All' },
  ]

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Sales</Text>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.iconBtn} onPress={handleExport} disabled={filtered.length === 0}>
            <Ionicons name="share-outline" size={18} color={filtered.length > 0 ? T.textSub : T.faint} />
          </TouchableOpacity>
          <TouchableOpacity style={s.addBtn} onPress={() => router.push('/sale/new')}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary */}
      <View style={s.summary}>
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>TOTAL</Text>
          <Text style={s.summaryAmount}>{fmt(total)}</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>CASH</Text>
          <Text style={[s.summaryAmount, { color: T.green }]}>{fmt(cashTotal)}</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>DEBT</Text>
          <Text style={[s.summaryAmount, { color: T.warning }]}>{fmt(total - cashTotal)}</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={s.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterBtn, filter === f.key && s.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={T.faint} style={s.searchIcon} />
        <TextInput
          style={s.search}
          placeholder="Search item or customer..."
          placeholderTextColor={T.faint}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {/* List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />}
      >
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No sales found</Text>
            <Text style={s.emptyText}>
              {filter === 'today' ? 'No sales recorded today.' : 'Try changing the filter.'}
            </Text>
          </View>
        ) : (
          <View style={s.list}>
            {filtered.map((sale, idx) => (
              <View
                key={sale.id}
                style={[s.row, idx === filtered.length - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={s.rowLeft}>
                  <Text style={s.rowItem} numberOfLines={1}>{sale.item}</Text>
                  <Text style={s.rowMeta}>
                    {sale.category}
                    {sale.customer ? ` · ${sale.customer}` : ''}
                    {' · '}
                    {new Date(sale.created_at).toLocaleDateString('en-NG', {
                      day: 'numeric', month: 'short',
                    })}
                  </Text>
                </View>
                <View style={s.rowRight}>
                  <Text style={[s.rowAmount, sale.is_debt && { color: T.warning }]}>
                    {fmt(sale.total)}
                  </Text>
                  {sale.is_debt && (
                    <Text style={s.debtTag}>DEBT</Text>
                  )}
                  <TouchableOpacity onPress={() => handleDelete(sale.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={15} color={T.faint} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  summaryAmount: { fontSize: 17, fontWeight: '800', color: T.text },

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },
  filterBtnActive: { backgroundColor: T.accent, borderColor: T.accent },
  filterText: { fontSize: 13, fontWeight: '600', color: T.muted },
  filterTextActive: { color: '#fff' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: T.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  search: { flex: 1, fontSize: 14, color: T.text, paddingVertical: 10 },

  empty: { padding: 40, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: T.text },
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
  rowItem: { fontSize: 14, fontWeight: '600', color: T.text },
  rowMeta: { fontSize: 11, color: T.muted },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowAmount: { fontSize: 15, fontWeight: '800', color: T.text },
  debtTag: {
    fontSize: 9,
    fontWeight: '700',
    color: T.warning,
    fontFamily: FONT.mono,
    letterSpacing: 0.5,
  },
})
