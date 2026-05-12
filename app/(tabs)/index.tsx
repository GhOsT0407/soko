import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { T, FONT } from '@/constants/theme'
import { TAILORED } from '@/constants/data'
import { useStore } from '@/store'
import type { BusinessTypeId } from '@/constants/data'

// ── 7-day revenue sparkline ──────────────────────────────────────────────────
function WeekChart({ sales }: { sales: ReturnType<typeof useStore.getState>['sales'] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const rev = sales
      .filter((s) => new Date(s.createdAt).toDateString() === d.toDateString())
      .reduce((sum, s) => sum + s.total, 0)
    return {
      label: d.toLocaleDateString('en-NG', { weekday: 'short' }).slice(0, 1),
      rev,
      isToday: i === 6,
    }
  })
  const max = Math.max(...days.map((d) => d.rev), 1)

  return (
    <View style={wc.wrap}>
      {days.map((d, i) => (
        <View key={i} style={wc.col}>
          <View style={wc.barTrack}>
            <View
              style={[
                wc.bar,
                { height: Math.max(3, (d.rev / max) * 36) },
                d.isToday && wc.barToday,
                d.rev === 0 && wc.barEmpty,
              ]}
            />
          </View>
          <Text style={[wc.label, d.isToday && wc.labelToday]}>{d.label}</Text>
        </View>
      ))}
    </View>
  )
}

export default function DashboardScreen() {
  const profile = useStore((s) => s.profile)
  const sales = useStore((s) => s.sales)
  const debts = useStore((s) => s.debts)

  const btypeId = (profile.businessType || 'trader') as BusinessTypeId
  const tailored = TAILORED[btypeId] || TAILORED.trader
  const name = profile.businessName || 'Your Business'

  const now = new Date()
  const todayStr = now.toDateString()

  const todaySales = sales.filter((s) => new Date(s.createdAt).toDateString() === todayStr)
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0)
  const todayCash = todaySales.filter((s) => !s.isDebt).reduce((sum, s) => sum + s.total, 0)

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayRevenue = sales
    .filter((s) => new Date(s.createdAt).toDateString() === yesterday.toDateString())
    .reduce((sum, s) => sum + s.total, 0)

  const growthPct =
    yesterdayRevenue > 0
      ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
      : null

  const thisMonthRevenue = sales
    .filter((s) => {
      const d = new Date(s.createdAt)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, s) => sum + s.total, 0)

  const outstanding = debts.filter((d) => !d.paid)
  const totalOwed = outstanding.reduce((sum, d) => sum + d.amount, 0)
  const recentSales = sales.slice(0, 6)

  // Best selling item this month
  const monthSales = sales.filter((s) => {
    const d = new Date(s.createdAt)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const itemTotals: Record<string, number> = {}
  monthSales.forEach((s) => {
    itemTotals[s.item] = (itemTotals[s.item] || 0) + s.total
  })
  const bestItem = Object.entries(itemTotals).sort((a, b) => b[1] - a[1])[0]

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerOrb1} />
          <View style={s.headerOrb2} />

          <View style={s.headerTop}>
            <View style={s.headerLeft}>
              <Text style={s.headerMono}>
                {now.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase()}
              </Text>
              <Text style={s.headerName}>{name}</Text>
              {profile.ownerName ? (
                <Text style={s.headerOwner}>{profile.ownerName}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={s.avatar}
              onPress={() => router.push('/settings' as any)}
              activeOpacity={0.8}
            >
              <Text style={s.avatarText}>{name.charAt(0).toUpperCase()}</Text>
              <View style={s.avatarSettingsDot}>
                <Ionicons name="settings-outline" size={8} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Revenue card ── */}
          <View style={s.revenueBlock}>
            <Text style={s.revenueLabel}>TODAY'S REVENUE</Text>
            <Text style={s.revenueAmount}>₦{todayRevenue.toLocaleString()}</Text>
            <View style={s.revenueRow}>
              {growthPct !== null && (
                <View style={[s.growthBadge, growthPct < 0 && s.growthBadgeDown]}>
                  <Ionicons
                    name={growthPct >= 0 ? 'trending-up' : 'trending-down'}
                    size={10}
                    color="#fff"
                  />
                  <Text style={s.growthText}> {Math.abs(growthPct)}%</Text>
                </View>
              )}
              <Text style={s.revenueSub}>
                {growthPct !== null ? 'vs yesterday' : 'No data yesterday'}
              </Text>
              {todaySales.length > 0 && todayRevenue !== todayCash && (
                <Text style={s.revenueCashNote}>
                  ₦{todayCash.toLocaleString()} cash
                </Text>
              )}
            </View>
          </View>

          {/* ── Week chart ── */}
          <View style={s.chartWrap}>
            <Text style={s.chartLabel}>7-DAY REVENUE</Text>
            <WeekChart sales={sales} />
          </View>

          {/* ── Month band ── */}
          <View style={s.monthBand}>
            <View style={s.monthStat}>
              <Text style={s.monthStatLabel}>THIS MONTH</Text>
              <Text style={s.monthStatVal}>₦{thisMonthRevenue.toLocaleString()}</Text>
            </View>
            <View style={s.monthDivider} />
            <View style={s.monthStat}>
              <Text style={s.monthStatLabel}>TODAY SALES</Text>
              <Text style={s.monthStatVal}>{todaySales.length}</Text>
            </View>
            <View style={s.monthDivider} />
            <View style={s.monthStat}>
              <Text style={s.monthStatLabel}>DEBTS OUT</Text>
              <Text style={[s.monthStatVal, outstanding.length > 0 && { color: T.warning }]}>
                {outstanding.length}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Quick actions ── */}
        <View style={s.actionsSection}>
          <Text style={s.sectionMono}>QUICK ACTIONS</Text>
          <View style={s.actions}>
            <TouchableOpacity
              style={[s.actionBtn, s.actionPrimary]}
              onPress={() => router.push('/sale/new')}
              activeOpacity={0.8}
            >
              <View style={s.actionIconCircle}>
                <Ionicons name="cash" size={20} color="#fff" />
              </View>
              <Text style={[s.actionLabel, s.actionLabelPrimary]}>{tailored.saleLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => router.navigate('/(tabs)/inventory')}
              activeOpacity={0.8}
            >
              <View style={[s.actionIconCircle, s.actionIconCircleMuted]}>
                <Ionicons name="cube-outline" size={20} color={T.accent} />
              </View>
              <Text style={s.actionLabel}>Stock</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => router.navigate('/(tabs)/debts')}
              activeOpacity={0.8}
            >
              <View style={[s.actionIconCircle, s.actionIconCircleMuted]}>
                <Ionicons name="people-outline" size={20} color={T.accent} />
              </View>
              <Text style={s.actionLabel}>Debts</Text>
            </TouchableOpacity>
          </View>

          {/* Import shortcut */}
          <TouchableOpacity
            style={s.importRow}
            onPress={() => router.push('/past-sales' as any)}
            activeOpacity={0.75}
          >
            <Ionicons name="cloud-upload-outline" size={16} color={T.accent} />
            <Text style={s.importText}>Import past sales from notebook or photo</Text>
            <Ionicons name="chevron-forward" size={14} color={T.faint} />
          </TouchableOpacity>
        </View>

        {/* ── Best seller this month ── */}
        {bestItem && (
          <View style={s.insightCard}>
            <View style={s.insightLeft}>
              <Ionicons name="star" size={14} color={T.revenue} />
              <Text style={s.insightLabel}>TOP SELLER THIS MONTH</Text>
            </View>
            <Text style={s.insightVal}>{bestItem[0]}</Text>
            <Text style={s.insightSub}>₦{bestItem[1].toLocaleString()} revenue</Text>
          </View>
        )}

        {/* ── Debt alert ── */}
        {outstanding.length > 0 && (
          <TouchableOpacity
            style={s.debtAlert}
            onPress={() => router.navigate('/(tabs)/debts')}
            activeOpacity={0.8}
          >
            <View style={s.debtAlertLeft}>
              <Ionicons name="warning" size={18} color={T.warning} />
            </View>
            <View style={s.debtAlertText}>
              <Text style={s.debtAlertTitle}>
                {outstanding.length} customer{outstanding.length > 1 ? 's' : ''} still owe you
              </Text>
              <Text style={s.debtAlertSub}>₦{totalOwed.toLocaleString()} outstanding · tap to view</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#B45309" />
          </TouchableOpacity>
        )}

        {/* ── Recent sales ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Recent Sales</Text>
            <TouchableOpacity onPress={() => router.navigate('/(tabs)/sales')}>
              <Text style={s.sectionLink}>See all →</Text>
            </TouchableOpacity>
          </View>
          {recentSales.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="cash-outline" size={40} color={T.faint} />
              <Text style={s.emptyTitle}>No sales yet</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/sale/new')}>
                <Text style={s.emptyBtnText}>Record your first sale</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentSales.map((sale) => (
              <View key={sale.id} style={s.saleRow}>
                <View style={[s.saleDot, sale.isDebt && { backgroundColor: T.warning }]} />
                <View style={s.saleInfo}>
                  <Text style={s.saleName}>{sale.item}</Text>
                  <Text style={s.saleMeta}>
                    {new Date(sale.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    {sale.customer ? ` · ${sale.customer}` : ''}
                    {sale.isDebt ? ' · Debt' : ''}
                  </Text>
                </View>
                <Text style={[s.saleAmount, sale.isDebt && s.saleAmountDebt]}>
                  +₦{sale.total.toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────

const wc = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    height: 52,
  },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '70%',
  },
  bar: {
    width: '100%',
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  barToday: { backgroundColor: T.revenue },
  barEmpty: { backgroundColor: 'rgba(255,255,255,0.06)' },
  label: { fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: FONT.mono },
  labelToday: { color: T.revenue, fontWeight: '700' },
})

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  // Header
  header: {
    backgroundColor: T.dark,
    paddingBottom: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  headerOrb1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: T.accentMid,
    opacity: 0.08,
    top: -60,
    right: -50,
  },
  headerOrb2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: T.revenue,
    opacity: 0.06,
    bottom: 0,
    left: -20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 4,
  },
  headerLeft: { gap: 2 },
  headerMono: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: FONT.mono, letterSpacing: 1 },
  headerName: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3, marginTop: 3 },
  headerOwner: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: T.accentMid,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  avatarSettingsDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: T.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: T.dark,
  },

  // Revenue block
  revenueBlock: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 12 },
  revenueLabel: { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: FONT.mono, letterSpacing: 1.5 },
  revenueAmount: {
    fontSize: 46,
    fontWeight: '900',
    color: T.revenue,
    letterSpacing: -2,
    marginTop: 4,
    marginBottom: 8,
    textShadowColor: T.revenueGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  revenueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.green,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  growthBadgeDown: { backgroundColor: T.error },
  growthText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  revenueSub: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  revenueCashNote: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontFamily: FONT.mono,
  },

  // Chart
  chartWrap: {
    paddingHorizontal: 22,
    paddingBottom: 16,
  },
  chartLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.25)',
    fontFamily: FONT.mono,
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  // Month band
  monthBand: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  monthStat: { flex: 1, alignItems: 'center', gap: 4 },
  monthStatLabel: { fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: FONT.mono, letterSpacing: 1 },
  monthStatVal: { fontSize: 14, fontWeight: '700', color: '#fff' },
  monthDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 2 },

  // Quick actions
  actionsSection: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
  sectionMono: { fontSize: 9, color: T.muted, fontFamily: FONT.mono, letterSpacing: 1.5, marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  actionBtn: {
    flex: 1,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionPrimary: {
    backgroundColor: T.accent,
    borderColor: T.accent,
    shadowOpacity: 0.25,
  },
  actionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconCircleMuted: { backgroundColor: T.accentLight },
  actionLabel: { fontSize: 11, fontWeight: '700', color: T.muted },
  actionLabelPrimary: { color: '#fff' },

  // Import row
  importRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 6,
  },
  importText: { flex: 1, fontSize: 13, color: T.muted },

  // Insight card
  insightCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  insightLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  insightLabel: { fontSize: 9, color: T.muted, fontFamily: FONT.mono, letterSpacing: 1.2 },
  insightVal: { fontSize: 15, fontWeight: '800', color: T.text },
  insightSub: { fontSize: 11, color: T.green, fontFamily: FONT.mono },

  // Debt alert
  debtAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: T.warning,
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 14,
    marginBottom: 10,
  },
  debtAlertLeft: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  debtAlertText: { flex: 1 },
  debtAlertTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  debtAlertSub: { fontSize: 11, color: '#B45309', marginTop: 1 },

  // Recent sales section
  section: { paddingHorizontal: 16, marginTop: 6 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: T.text },
  sectionLink: { fontSize: 12, color: T.accent, fontWeight: '600' },

  saleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  saleDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.accent, flexShrink: 0 },
  saleInfo: { flex: 1 },
  saleName: { fontSize: 13, fontWeight: '700', color: T.text },
  saleMeta: { fontSize: 10, color: T.faint, fontFamily: FONT.mono, marginTop: 2 },
  saleAmount: { fontSize: 15, fontWeight: '800', color: T.green },
  saleAmountDebt: { color: T.warning },

  empty: { alignItems: 'center', paddingVertical: 36, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: T.muted },
  emptyBtn: {
    backgroundColor: T.accent,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
