import { useEffect, useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { T, FONT } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { scheduleDebtReminder } from '@/lib/notifications'
import { useStore } from '@/store'
import type { Sale, Debt, InventoryItem } from '@/types'

function fmt(n: number) {
  return '₦' + n.toLocaleString()
}

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

export default function DashboardScreen() {
  const activeBusiness = useStore((s) => s.activeBusiness)
  const session = useStore((s) => s.session)

  const [sales, setSales] = useState<Sale[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!activeBusiness) return
    const [s, d, i] = await Promise.all([
      supabase
        .from('sales')
        .select('*')
        .eq('business_id', activeBusiness.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('debts')
        .select('*')
        .eq('business_id', activeBusiness.id)
        .eq('paid', false),
      supabase
        .from('inventory')
        .select('*')
        .eq('business_id', activeBusiness.id),
    ])
    if (s.data) setSales(s.data)
    if (d.data) setDebts(d.data)
    if (i.data) setInventory(i.data)
    setLoading(false)
  }, [activeBusiness])

  useEffect(() => { load() }, [load])

  // Reschedule debt notification whenever debt data updates
  const scheduledRef = useRef(false)
  useEffect(() => {
    if (debts.length === 0 && !scheduledRef.current) return
    scheduledRef.current = true
    const overdue = debts.filter((d) => daysSince(d.created_at) > 7)
    const amount = overdue.reduce((sum, d) => sum + (d.amount - d.amount_paid), 0)
    scheduleDebtReminder(overdue.length, amount).catch(() => {})
  }, [debts])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  // Computed stats
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  const todaySales = sales.filter((s) => new Date(s.created_at).toDateString() === today)
  const yesterdaySales = sales.filter((s) => new Date(s.created_at).toDateString() === yesterday)
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0)
  const yesterdayRevenue = yesterdaySales.reduce((sum, s) => sum + s.total, 0)
  const todayCash = todaySales.filter((s) => !s.is_debt).reduce((sum, s) => sum + s.total, 0)
  const revenueChangePct = yesterdayRevenue > 0
    ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
    : null

  const overdueDebts = debts.filter((d) => daysSince(d.created_at) > 7)
  const totalOwed = debts.reduce((sum, d) => sum + (d.amount - d.amount_paid), 0)

  const lowStock = inventory.filter((i) => i.qty <= i.low_stock_threshold)

  const recentSales = sales.slice(0, 5)

  function buildDailySummary(): string {
    if (todaySales.length === 0) {
      if (overdueDebts.length > 0) {
        const amt = overdueDebts.reduce((sum, d) => sum + (d.amount - d.amount_paid), 0)
        return `No sales yet today. You have ${overdueDebts.length} overdue debt${overdueDebts.length !== 1 ? 's' : ''} worth ${fmt(amt)} — consider chasing them.`
      }
      return 'No sales recorded yet today. Tap the button below to get started.'
    }
    const parts: string[] = [
      `${todaySales.length} sale${todaySales.length !== 1 ? 's' : ''} today totalling ${fmt(todayRevenue)}.`,
    ]
    if (overdueDebts.length > 0) {
      const amt = overdueDebts.reduce((sum, d) => sum + (d.amount - d.amount_paid), 0)
      parts.push(`${overdueDebts.length} overdue debt${overdueDebts.length !== 1 ? 's' : ''} worth ${fmt(amt)} need chasing.`)
    } else if (totalOwed > 0) {
      parts.push(`${debts.length} customer${debts.length !== 1 ? 's' : ''} owe you ${fmt(totalOwed)} total.`)
    }
    if (lowStock.length > 0) {
      parts.push(`Restock ${lowStock.length} item${lowStock.length !== 1 ? 's' : ''} soon.`)
    }
    return parts.join(' ')
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const ownerName = activeBusiness?.owner_name || session?.user.email?.split('@')[0] || 'there'

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTop}>
            <View>
              <Text style={s.greeting}>{greeting()},</Text>
              <Text style={s.ownerName}>{ownerName} 👋</Text>
            </View>
            <View style={s.headerActions}>
              <TouchableOpacity style={s.headerBtn} onPress={() => router.push('/settings')}>
                <Ionicons name="settings-outline" size={20} color={T.textSub} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={s.businessName}>{activeBusiness?.name}</Text>
        </View>

        <View style={s.body}>
          {/* Today's revenue */}
          <View style={s.revenueCard}>
            <Text style={s.revenueLabel}>TODAY'S REVENUE</Text>
            <View style={s.revenueAmountRow}>
              <Text style={s.revenueAmount}>{fmt(todayRevenue)}</Text>
              {revenueChangePct !== null && (
                <View style={[s.changeBadge, revenueChangePct < 0 && s.changeBadgeDown]}>
                  <Ionicons
                    name={revenueChangePct >= 0 ? 'arrow-up' : 'arrow-down'}
                    size={11}
                    color={revenueChangePct >= 0 ? T.green : T.error}
                  />
                  <Text style={[s.changeBadgeText, revenueChangePct < 0 && { color: T.error }]}>
                    {Math.abs(revenueChangePct)}%
                  </Text>
                </View>
              )}
            </View>
            <View style={s.revenueRow}>
              <View style={s.revenueStat}>
                <View style={[s.revenueDot, { backgroundColor: T.green }]} />
                <Text style={s.revenueStatText}>{fmt(todayCash)} cash</Text>
              </View>
              <View style={s.revenueStat}>
                <View style={[s.revenueDot, { backgroundColor: T.warning }]} />
                <Text style={s.revenueStatText}>{fmt(todayRevenue - todayCash)} debt</Text>
              </View>
              <Text style={s.revenueStat2}>{todaySales.length} sales</Text>
            </View>
          </View>

          {/* Daily summary */}
          {!loading && (
            <View style={s.summaryCard}>
              <Ionicons name="bulb-outline" size={14} color={T.accent} />
              <Text style={s.summaryText}>{buildDailySummary()}</Text>
            </View>
          )}

          {/* Alerts */}
          {(overdueDebts.length > 0 || lowStock.length > 0) && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>NEEDS ATTENTION</Text>
              <View style={s.alerts}>
                {overdueDebts.length > 0 && (
                  <TouchableOpacity
                    style={s.alertCard}
                    onPress={() => router.push('/(tabs)/debts')}
                    activeOpacity={0.8}
                  >
                    <View style={[s.alertIcon, { backgroundColor: T.errorLight }]}>
                      <Ionicons name="warning-outline" size={16} color={T.error} />
                    </View>
                    <View style={s.alertText}>
                      <Text style={s.alertTitle}>
                        {overdueDebts.length} overdue debt{overdueDebts.length > 1 ? 's' : ''}
                      </Text>
                      <Text style={s.alertSub}>
                        {fmt(overdueDebts.reduce((sum, d) => sum + (d.amount - d.amount_paid), 0))} unpaid for 7+ days
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={T.faint} />
                  </TouchableOpacity>
                )}

                {lowStock.length > 0 && (
                  <TouchableOpacity
                    style={s.alertCard}
                    onPress={() => router.push('/(tabs)/inventory')}
                    activeOpacity={0.8}
                  >
                    <View style={[s.alertIcon, { backgroundColor: T.warningLight }]}>
                      <Ionicons name="cube-outline" size={16} color={T.warning} />
                    </View>
                    <View style={s.alertText}>
                      <Text style={s.alertTitle}>
                        {lowStock.length} item{lowStock.length > 1 ? 's' : ''} low on stock
                      </Text>
                      <Text style={s.alertSub}>
                        {lowStock.map((i) => i.name).slice(0, 3).join(', ')}
                        {lowStock.length > 3 ? ` +${lowStock.length - 3} more` : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={T.faint} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Outstanding debts summary */}
          {totalOwed > 0 && (
            <TouchableOpacity
              style={s.debtBanner}
              onPress={() => router.push('/(tabs)/debts')}
              activeOpacity={0.8}
            >
              <View>
                <Text style={s.debtBannerLabel}>TOTAL OWED TO YOU</Text>
                <Text style={s.debtBannerAmount}>{fmt(totalOwed)}</Text>
                <Text style={s.debtBannerSub}>from {debts.length} customer{debts.length !== 1 ? 's' : ''}</Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={28} color={T.accent} />
            </TouchableOpacity>
          )}

          {/* Recent sales */}
          <View style={s.section}>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>RECENT SALES</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/sales')}>
                <Text style={s.sectionLink}>See all</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <Text style={s.emptyText}>Loading...</Text>
            ) : recentSales.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={s.emptyTitle}>No sales yet</Text>
                <Text style={s.emptyText}>Tap the button below to record your first sale.</Text>
              </View>
            ) : (
              <View style={s.saleList}>
                {recentSales.map((sale) => (
                  <View key={sale.id} style={s.saleRow}>
                    <View style={s.saleLeft}>
                      <Text style={s.saleItem} numberOfLines={1}>{sale.item}</Text>
                      {sale.customer ? (
                        <Text style={s.saleCustomer}>{sale.customer}</Text>
                      ) : null}
                    </View>
                    <View style={s.saleRight}>
                      <Text style={[s.saleAmount, sale.is_debt && { color: T.warning }]}>
                        {fmt(sale.total)}
                      </Text>
                      {sale.is_debt && (
                        <View style={s.debtBadge}>
                          <Text style={s.debtBadgeText}>DEBT</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={{ height: 20 }} />
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => router.push('/sale/new')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color="#fff" />
        <Text style={s.fabText}>Record Sale</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    gap: 4,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: { fontSize: 13, color: T.muted },
  ownerName: { fontSize: 20, fontWeight: '800', color: T.text, letterSpacing: -0.5 },
  businessName: { fontSize: 12, color: T.accent, fontWeight: '600', marginTop: 4 },

  body: { padding: 20, gap: 20 },

  revenueCard: {
    backgroundColor: T.dark,
    borderRadius: 18,
    padding: 20,
    gap: 8,
  },
  revenueLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
    fontFamily: FONT.mono,
  },
  revenueAmountRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  revenueAmount: {
    fontSize: 40,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1.5,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(52,211,153,.16)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  changeBadgeDown: { backgroundColor: 'rgba(220,38,38,.16)' },
  changeBadgeText: { fontSize: 11, fontWeight: '700', color: T.green },
  revenueRow: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  revenueStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  revenueDot: { width: 8, height: 8, borderRadius: 4 },
  revenueStatText: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  revenueStat2: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: T.accentLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.accent + '22',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  summaryText: { flex: 1, fontSize: 13, color: T.accent, fontWeight: '500', lineHeight: 19 },

  section: { gap: 10 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: T.muted,
    letterSpacing: 1.5,
    fontFamily: FONT.mono,
  },
  sectionLink: { fontSize: 13, color: T.accent, fontWeight: '600' },

  alerts: { gap: 8 },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertText: { flex: 1, gap: 2 },
  alertTitle: { fontSize: 14, fontWeight: '700', color: T.text },
  alertSub: { fontSize: 12, color: T.muted },

  debtBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: T.accentLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.accent + '33',
    padding: 16,
  },
  debtBannerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: T.accent,
    letterSpacing: 1.5,
    fontFamily: FONT.mono,
    marginBottom: 4,
  },
  debtBannerAmount: { fontSize: 26, fontWeight: '900', color: T.accent, letterSpacing: -0.5 },
  debtBannerSub: { fontSize: 12, color: T.accentMid, marginTop: 2 },

  emptyCard: {
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: T.text },
  emptyText: { fontSize: 13, color: T.muted, textAlign: 'center' },

  saleList: {
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
  },
  saleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  saleLeft: { flex: 1, gap: 2 },
  saleItem: { fontSize: 14, fontWeight: '600', color: T.text },
  saleCustomer: { fontSize: 12, color: T.muted },
  saleRight: { alignItems: 'flex-end', gap: 3 },
  saleAmount: { fontSize: 15, fontWeight: '800', color: T.text },
  debtBadge: {
    backgroundColor: T.warningLight,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  debtBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: T.warning,
    letterSpacing: 0.5,
    fontFamily: FONT.mono,
  },

  fab: {
    position: 'absolute',
    bottom: 84,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: T.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowColor: T.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
