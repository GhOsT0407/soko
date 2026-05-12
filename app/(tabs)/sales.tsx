import { useState, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { T, FONT } from '@/constants/theme'
import { useStore } from '@/store'
import type { Sale } from '@/types'

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date().toDateString()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short' })
}

function groupByDate(sales: Sale[]) {
  const groups: Record<string, Sale[]> = {}
  for (const sale of sales) {
    const key = new Date(sale.createdAt).toDateString()
    if (!groups[key]) groups[key] = []
    groups[key].push(sale)
  }
  return Object.entries(groups)
}

function groupByMonth(sales: Sale[]) {
  const groups: Record<string, Sale[]> = {}
  for (const sale of sales) {
    const d = new Date(sale.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!groups[key]) groups[key] = []
    groups[key].push(sale)
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

function formatMonthKey(key: string) {
  const [year, month] = key.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  return d.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
}

type ViewMode = 'daily' | 'monthly' | 'yearly'

export default function SalesScreen() {
  const sales = useStore((s) => s.sales)
  const deleteSale = useStore((s) => s.deleteSale)
  const [view, setView] = useState<ViewMode>('daily')
  const [query, setQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  const now = new Date()

  const todayRevenue = sales
    .filter((s) => new Date(s.createdAt).toDateString() === now.toDateString())
    .reduce((sum, s) => sum + s.total, 0)

  const thisMonthRevenue = sales
    .filter((s) => {
      const d = new Date(s.createdAt)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, s) => sum + s.total, 0)

  const thisYearRevenue = sales
    .filter((s) => new Date(s.createdAt).getFullYear() === now.getFullYear())
    .reduce((sum, s) => sum + s.total, 0)

  const filtered = useMemo(() => {
    if (!query.trim()) return sales
    const q = query.toLowerCase()
    return sales.filter(
      (s) =>
        s.item.toLowerCase().includes(q) ||
        (s.customer && s.customer.toLowerCase().includes(q)) ||
        s.category.toLowerCase().includes(q)
    )
  }, [sales, query])

  const grouped = groupByDate(filtered)
  const groupedMonthly = groupByMonth(filtered)

  const yearlyGroups: Record<string, { total: number; count: number }> = {}
  for (const sale of filtered) {
    const year = String(new Date(sale.createdAt).getFullYear())
    if (!yearlyGroups[year]) yearlyGroups[year] = { total: 0, count: 0 }
    yearlyGroups[year].total += sale.total
    yearlyGroups[year].count += 1
  }
  const yearlyEntries = Object.entries(yearlyGroups).sort((a, b) => b[0].localeCompare(a[0]))

  function confirmDelete(sale: Sale) {
    Alert.alert(
      'Delete Sale',
      `Remove "${sale.item}" (₦${sale.total.toLocaleString()})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteSale(sale.id) },
      ]
    )
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerMono}>SALES HISTORY</Text>
          <Text style={s.headerTitle}>₦{todayRevenue.toLocaleString()} today</Text>
        </View>
        <View style={s.headerBtns}>
          <TouchableOpacity style={s.importBtn} onPress={() => router.push('/past-sales' as any)}>
            <Ionicons name="cloud-upload-outline" size={14} color="rgba(255,255,255,0.75)" />
            <Text style={s.importBtnText}> Import</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.addBtn} onPress={() => router.push('/sale/new')}>
            <Text style={s.addBtnText}>+ Record</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary cards */}
      <View style={s.summaryRow}>
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>THIS MONTH</Text>
          <Text style={s.summaryAmount}>₦{thisMonthRevenue.toLocaleString()}</Text>
          <Text style={s.summaryMeta}>{now.toLocaleDateString('en-NG', { month: 'long' })}</Text>
        </View>
        <View style={[s.summaryCard, s.summaryCardYear]}>
          <Text style={[s.summaryLabel, s.summaryLabelYear]}>THIS YEAR</Text>
          <Text style={[s.summaryAmount, s.summaryAmountYear]}>₦{thisYearRevenue.toLocaleString()}</Text>
          <Text style={[s.summaryMeta, s.summaryMetaYear]}>{now.getFullYear()} · {sales.length} total</Text>
        </View>
      </View>

      {/* Search bar */}
      <View style={s.searchWrap}>
        <View style={[s.searchBar, searchFocused && s.searchBarFocused]}>
          <Ionicons name="search-outline" size={16} color={T.faint} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by item, customer, category…"
            placeholderTextColor={T.faint}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={T.faint} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* View switcher */}
      <View style={s.tabs}>
        {(['daily', 'monthly', 'yearly'] as ViewMode[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.tab, view === t && s.tabActive]}
            onPress={() => setView(t)}
          >
            <Text style={[s.tabText, view === t && s.tabTextActive]}>
              {t === 'daily' ? 'Daily' : t === 'monthly' ? 'Monthly' : 'Yearly'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="cash-outline" size={40} color={T.faint} />
            <Text style={s.emptyTitle}>{query ? 'No matches' : 'No sales yet'}</Text>
            <Text style={s.emptySub}>
              {query ? `Nothing found for "${query}"` : 'Record a sale or import your past records'}
            </Text>
            {!query && (
              <TouchableOpacity style={s.emptyImportBtn} onPress={() => router.push('/past-sales' as any)}>
                <Text style={s.emptyImportBtnText}>↑ Import Past Sales</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : view === 'daily' ? (
          grouped.map(([date, group]) => {
            const groupTotal = group.reduce((sum, s) => sum + s.total, 0)
            return (
              <View key={date} style={s.group}>
                <View style={s.groupHeader}>
                  <Text style={s.groupDate}>{formatDateLabel(date)}</Text>
                  <Text style={s.groupTotal}>₦{groupTotal.toLocaleString()}</Text>
                </View>
                {group.map((sale) => (
                  <View key={sale.id} style={s.saleRow}>
                    <View style={[s.salePill, sale.isDebt && s.salePillDebt]}>
                      <Text style={[s.salePillText, sale.isDebt && s.salePillTextDebt]}>
                        {sale.category || 'Sale'}
                      </Text>
                    </View>
                    <View style={s.saleInfo}>
                      <Text style={s.saleName}>{sale.item}</Text>
                      <Text style={s.saleMeta}>
                        {sale.qty > 1 ? `×${sale.qty}  ` : ''}
                        {sale.customer || ''}
                        {sale.isDebt ? '  · Debt' : ''}
                      </Text>
                    </View>
                    <Text style={[s.saleAmount, sale.isDebt && s.saleAmountDebt]}>
                      +₦{sale.total.toLocaleString()}
                    </Text>
                    <TouchableOpacity
                      onPress={() => confirmDelete(sale)}
                      hitSlop={8}
                      style={s.deleteBtn}
                    >
                      <Ionicons name="trash-outline" size={15} color={T.faint} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )
          })
        ) : view === 'monthly' ? (
          groupedMonthly.map(([monthKey, monthSales]) => {
            const monthTotal = monthSales.reduce((sum, ms) => sum + ms.total, 0)
            const cashTotal = monthSales.filter((ms) => !ms.isDebt).reduce((sum, ms) => sum + ms.total, 0)
            const debtTotal = monthSales.filter((ms) => ms.isDebt).reduce((sum, ms) => sum + ms.total, 0)
            return (
              <View key={monthKey} style={s.monthCard}>
                <View style={s.monthHeader}>
                  <Text style={s.monthName}>{formatMonthKey(monthKey)}</Text>
                  <Text style={s.monthTotal}>₦{monthTotal.toLocaleString()}</Text>
                </View>
                <View style={s.monthStats}>
                  <View style={s.monthStat}>
                    <Text style={s.monthStatLabel}>TRANSACTIONS</Text>
                    <Text style={s.monthStatVal}>{monthSales.length}</Text>
                  </View>
                  <View style={s.monthStat}>
                    <Text style={s.monthStatLabel}>CASH</Text>
                    <Text style={[s.monthStatVal, { color: T.green }]}>₦{cashTotal.toLocaleString()}</Text>
                  </View>
                  {debtTotal > 0 && (
                    <View style={s.monthStat}>
                      <Text style={s.monthStatLabel}>ON DEBT</Text>
                      <Text style={[s.monthStatVal, { color: T.warning }]}>₦{debtTotal.toLocaleString()}</Text>
                    </View>
                  )}
                </View>
              </View>
            )
          })
        ) : (
          yearlyEntries.map(([year, data]) => (
            <View key={year} style={s.yearCard}>
              <View style={s.yearLeft}>
                <Text style={s.yearNum}>{year}</Text>
                <Text style={s.yearCount}>{data.count} sale{data.count !== 1 ? 's' : ''}</Text>
              </View>
              <Text style={s.yearTotal}>₦{data.total.toLocaleString()}</Text>
            </View>
          ))
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
    backgroundColor: T.dark,
  },
  headerMono: { fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: FONT.mono, letterSpacing: 1.5 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3, marginTop: 2 },
  headerBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  importBtnText: { color: 'rgba(255,255,255,0.75)', fontWeight: '600', fontSize: 12 },
  addBtn: { backgroundColor: T.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  summaryRow: {
    flexDirection: 'row',
    backgroundColor: T.dark,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 12,
    gap: 2,
  },
  summaryCardYear: { backgroundColor: 'rgba(139,92,246,0.2)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  summaryLabel: { fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: FONT.mono, letterSpacing: 1.2 },
  summaryLabelYear: { color: 'rgba(167,139,250,0.9)' },
  summaryAmount: { fontSize: 20, fontWeight: '900', color: T.revenue, letterSpacing: -0.5, marginTop: 2 },
  summaryAmountYear: { color: T.accentMid },
  summaryMeta: { fontSize: 10, color: 'rgba(255,255,255,0.3)' },
  summaryMetaYear: { color: T.accentMid + '99' },

  searchWrap: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: T.bg },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  searchBarFocused: { borderColor: T.accent },
  searchInput: { flex: 1, fontSize: 14, color: T.text },

  tabs: { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 6, gap: 6 },
  tab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },
  tabActive: { backgroundColor: T.accent, borderColor: T.accent },
  tabText: { fontSize: 12, fontWeight: '600', color: T.muted },
  tabTextActive: { color: '#fff' },

  scroll: { padding: 14 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: T.dark },
  emptySub: { fontSize: 13, color: T.muted, textAlign: 'center' },
  emptyImportBtn: {
    marginTop: 4,
    backgroundColor: T.accentLight,
    borderWidth: 1.5,
    borderColor: T.accent,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyImportBtnText: { color: T.accent, fontWeight: '700', fontSize: 14 },

  group: { marginBottom: 20 },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupDate: { fontSize: 11, fontWeight: '700', color: T.muted, fontFamily: FONT.mono, letterSpacing: 1 },
  groupTotal: { fontSize: 13, fontWeight: '700', color: T.green },

  saleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
  },
  salePill: { backgroundColor: T.accentLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  salePillDebt: { backgroundColor: T.warningLight },
  salePillText: { fontSize: 9, fontWeight: '700', color: T.accent },
  salePillTextDebt: { color: T.warning },
  saleInfo: { flex: 1 },
  saleName: { fontSize: 13, fontWeight: '600', color: T.dark },
  saleMeta: { fontSize: 10, color: T.faint, fontFamily: FONT.mono, marginTop: 2 },
  saleAmount: { fontSize: 14, fontWeight: '700', color: T.green },
  saleAmountDebt: { color: T.warning },
  deleteBtn: { padding: 4 },

  monthCard: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    gap: 12,
  },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  monthName: { fontSize: 15, fontWeight: '700', color: T.dark },
  monthTotal: { fontSize: 18, fontWeight: '900', color: T.accent, letterSpacing: -0.5 },
  monthStats: { flexDirection: 'row', gap: 16 },
  monthStat: { gap: 2 },
  monthStatLabel: { fontSize: 8, color: T.muted, fontFamily: FONT.mono, letterSpacing: 1 },
  monthStatVal: { fontSize: 13, fontWeight: '700', color: T.dark },

  yearCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 10,
  },
  yearLeft: { gap: 2 },
  yearNum: { fontSize: 22, fontWeight: '900', color: T.dark, letterSpacing: -0.5 },
  yearCount: { fontSize: 11, color: T.muted, fontFamily: FONT.mono },
  yearTotal: { fontSize: 24, fontWeight: '900', color: T.accent, letterSpacing: -0.5 },
})
