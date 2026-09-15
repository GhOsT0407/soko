import { useState, useCallback } from 'react'
import { View, StyleSheet, ScrollView, Pressable, RefreshControl, Alert, Share } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { T, SP, FONT } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { naira, whenLabel, plural } from '@/lib/format'
import { useStore } from '@/store'
import type { Sale } from '@/types'
import {
  Screen, Txt, Card, IconButton, Input, Segmented, ListRow, EmptyState, ScreenHeader,
} from '@/components'

type Filter = 'today' | 'week' | 'month' | 'all'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'all', label: 'All' },
]

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

  const emptyBody =
    query ? 'Nothing matches that search.'
    : filter === 'today' ? 'No sales recorded today.'
    : 'Try a wider period.'

  return (
    <Screen>
      <ScreenHeader
        title="Sales"
        subtitle={sales.length ? `${plural(sales.length, 'sale')} in the book` : undefined}
        right={
          <>
            <IconButton icon="share-outline" onPress={handleExport} disabled={filtered.length === 0} accessibilityLabel="Export as CSV" />
            <IconButton icon="add" variant="primary" onPress={() => router.push('/sale/new')} accessibilityLabel="Record sale" />
          </>
        }
      />

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />}
      >
        <Segmented options={FILTERS} value={filter} onChange={setFilter} />

        {/* Period totals */}
        <Card style={s.totals}>
          <View style={s.totalMain}>
            <Txt variant="label">Total</Txt>
            <Txt variant="amountLg">{naira(total)}</Txt>
          </View>
          <View style={s.totalSplit}>
            <View style={s.totalCol}>
              <Txt variant="label">Cash</Txt>
              <Txt variant="amount" color={T.green}>{naira(cashTotal)}</Txt>
            </View>
            <View style={s.totalCol}>
              <Txt variant="label">Credit</Txt>
              <Txt variant="amount" color={T.warning}>{naira(total - cashTotal)}</Txt>
            </View>
          </View>
        </Card>

        <Input
          icon="search-outline"
          placeholder="Search item or customer"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
        />

        {filtered.length === 0 ? (
          <Card padded={false}>
            <EmptyState icon="receipt-outline" title="No sales found" body={emptyBody} />
          </Card>
        ) : (
          <Card padded={false}>
            {filtered.map((sale, idx) => (
              <ListRow
                key={sale.id}
                when={whenLabel(sale.created_at)}
                title={sale.item}
                meta={
                  <Txt variant="meta" numberOfLines={1}>
                    {sale.category}{sale.customer ? ` · ${sale.customer}` : ''}
                    {sale.is_debt ? <Txt style={s.onCredit}> · on credit</Txt> : null}
                  </Txt>
                }
                amount={naira(sale.total)}
                amountColor={sale.is_debt ? T.warning : undefined}
                trailing={
                  <Pressable onPress={() => handleDelete(sale.id)} hitSlop={10} accessibilityLabel="Delete sale" accessibilityRole="button">
                    <Ionicons name="trash-outline" size={16} color={T.faint} />
                  </Pressable>
                }
                last={idx === filtered.length - 1}
              />
            ))}
          </Card>
        )}
      </ScrollView>
    </Screen>
  )
}

const s = StyleSheet.create({
  content: { paddingHorizontal: SP.xl, gap: SP.md, paddingBottom: SP.xxl },

  totals: { flexDirection: 'row', alignItems: 'center', gap: SP.lg, padding: 14 },
  totalMain: { flex: 1.2, gap: 3 },
  totalSplit: { flex: 1.6, flexDirection: 'row', gap: SP.md, borderLeftWidth: 1, borderLeftColor: T.border, paddingLeft: SP.lg },
  totalCol: { flex: 1, gap: 3 },

  onCredit: { fontFamily: FONT.serifItalic, fontSize: 12, lineHeight: 16, color: T.error },
})
