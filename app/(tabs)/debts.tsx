import { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native'
import { router } from 'expo-router'
import { useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { T, FONT } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'
import type { Debt } from '@/types'

type Filter = 'all' | 'overdue' | 'partial' | 'pending'

function fmt(n: number) { return '₦' + n.toLocaleString() }

function daysSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
}

function balance(d: Debt) { return d.amount - d.amount_paid }

function sendWhatsApp(debt: Debt) {
  const bal = debt.amount - debt.amount_paid
  const msg = `Hello ${debt.customer}, you still owe *₦${bal.toLocaleString()}*${debt.description ? ` for ${debt.description}` : ''}. Please pay when convenient. Thank you! 🙏`
  const raw = (debt.phone || '').replace(/\D/g, '')
  const phone = raw.startsWith('0') ? '234' + raw.slice(1) : raw
  Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`)
}

function statusOf(d: Debt): { label: string; color: string; bg: string } {
  if (d.amount_paid > 0 && d.amount_paid < d.amount) return { label: 'PARTIAL', color: T.warning, bg: T.warningLight }
  if (daysSince(d.created_at) > 7) return { label: 'OVERDUE', color: T.error, bg: T.errorLight }
  return { label: 'PENDING', color: T.muted, bg: T.surfaceHigh }
}

const CACHE_TTL = 30_000

export default function DebtsScreen() {
  const activeBusiness = useStore((s) => s.activeBusiness)
  const setDebtsCache = useStore((s) => s.setDebtsCache)
  const [debts, setDebts] = useState<Debt[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!activeBusiness) return
    const { data } = await supabase
      .from('debts')
      .select('*')
      .eq('business_id', activeBusiness.id)
      .eq('paid', false)
      .order('created_at', { ascending: false })
    if (data) {
      setDebts(data)
      setDebtsCache({ data, at: Date.now() })
    }
  }, [activeBusiness, setDebtsCache])

  useFocusEffect(useCallback(() => {
    const cache = useStore.getState().debtsCache
    if (cache && Date.now() - cache.at < CACHE_TTL) {
      setDebts(cache.data)
      return
    }
    load()
  }, [load]))

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const filtered = debts.filter((d) => {
    if (filter === 'overdue') return daysSince(d.created_at) > 7 && d.amount_paid === 0
    if (filter === 'partial') return d.amount_paid > 0 && d.amount_paid < d.amount
    if (filter === 'pending') return d.amount_paid === 0 && daysSince(d.created_at) <= 7
    return true
  })

  const totalOwed = debts.reduce((sum, d) => sum + balance(d), 0)
  const overdueCount = debts.filter((d) => daysSince(d.created_at) > 7 && d.amount_paid === 0).length

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'partial', label: 'Partial' },
    { key: 'pending', label: 'Pending' },
  ]

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Debts</Text>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => router.push('/debt/new' as any)}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={s.summary}>
        <View>
          <Text style={s.summaryLabel}>TOTAL OWED TO YOU</Text>
          <Text style={s.summaryAmount}>{fmt(totalOwed)}</Text>
          <Text style={s.summarySub}>
            {debts.length} customer{debts.length !== 1 ? 's' : ''}
            {overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}
          </Text>
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />}
      >
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="checkmark-circle-outline" size={40} color={T.green} />
            <Text style={s.emptyTitle}>All clear!</Text>
            <Text style={s.emptyText}>No debts in this category.</Text>
          </View>
        ) : (
          <View style={s.list}>
            {filtered.map((debt, idx) => {
              const st = statusOf(debt)
              return (
                <View
                  key={debt.id}
                  style={[s.row, idx === filtered.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <TouchableOpacity
                    style={s.rowMain}
                    onPress={() => router.push(`/debt/${debt.id}` as any)}
                    activeOpacity={0.75}
                  >
                    <View style={s.rowLeft}>
                      <View style={s.rowTop}>
                        <Text style={s.rowCustomer} numberOfLines={1}>{debt.customer}</Text>
                        <View style={[s.badge, { backgroundColor: st.bg }]}>
                          <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                        </View>
                      </View>
                      {debt.description ? (
                        <Text style={s.rowDesc} numberOfLines={1}>{debt.description}</Text>
                      ) : null}
                      <Text style={s.rowDate}>{daysSince(debt.created_at)} days ago</Text>
                    </View>
                    <View style={s.rowRight}>
                      <Text style={s.rowBalance}>{fmt(balance(debt))}</Text>
                      {debt.amount_paid > 0 && (
                        <Text style={s.rowPaid}>paid {fmt(debt.amount_paid)}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  {debt.phone ? (
                    <TouchableOpacity style={s.waQuickBtn} onPress={() => sendWhatsApp(debt)} activeOpacity={0.7}>
                      <Ionicons name="logo-whatsapp" size={19} color="#25D366" />
                    </TouchableOpacity>
                  ) : null}
                </View>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: T.muted,
    letterSpacing: 1.5,
    fontFamily: FONT.mono,
    marginBottom: 4,
  },
  summaryAmount: { fontSize: 32, fontWeight: '900', color: T.text, letterSpacing: -1 },
  summarySub: { fontSize: 12, color: T.muted, marginTop: 4 },

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

  empty: { padding: 48, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: T.text },
  emptyText: { fontSize: 13, color: T.muted },

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
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  waQuickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderLeftWidth: 1,
    borderLeftColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLeft: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowCustomer: { fontSize: 15, fontWeight: '700', color: T.text, flex: 1 },
  badge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, fontFamily: FONT.mono },
  rowDesc: { fontSize: 12, color: T.muted },
  rowDate: { fontSize: 11, color: T.faint },
  rowRight: { alignItems: 'flex-end', gap: 3 },
  rowBalance: { fontSize: 17, fontWeight: '900', color: T.text },
  rowPaid: { fontSize: 11, color: T.green },
})
