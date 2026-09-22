import { useEffect, useState, useCallback, useRef } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { T, SP, FONT } from '@/constants/theme'
import { BUSINESS_TYPES, TAILORED, type BusinessTypeId } from '@/constants/data'
import { supabase } from '@/lib/supabase'
import { scheduleDebtReminder } from '@/lib/notifications'
import { naira, whenLabel, plural } from '@/lib/format'
import { isOverdue } from '@/lib/debts'
import { useStore } from '@/store'
import type { Sale, Debt, InventoryItem } from '@/types'
import {
  Screen, Txt, Card, Button, Segmented, StatTile, SectionHeader, ListRow, EmptyState, NoteCard, Avatar,
} from '@/components'

type Period = 'today' | 'yesterday' | 'week'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This week' },
]

const DAY = 86400000
const CACHE_TTL = 30_000

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function between(sale: Sale, from: Date, to: Date) {
  const t = new Date(sale.created_at).getTime()
  return t >= from.getTime() && t < to.getTime()
}

// Sentence-case the tailored copy ("Log a Job" → "Log a job") so it sits
// beside the kit's other buttons.
function sentence(label: string) {
  return label.charAt(0) + label.slice(1).toLowerCase()
}

export default function DashboardScreen() {
  const activeBusiness = useStore((s) => s.activeBusiness)
  const session = useStore((s) => s.session)

  const [sales, setSales] = useState<Sale[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState<Period>('today')

  const load = useCallback(async (force = false) => {
    if (!activeBusiness) return
    // Serve the shared 30s cache when every slice is fresh, like the other
    // tabs do; a pull-to-refresh forces a fetch.
    const st = useStore.getState()
    const fresh = <R,>(c: { data: R[]; at: number } | null) =>
      !force && c && Date.now() - c.at < CACHE_TTL ? c.data : null
    const cs = fresh(st.salesCache)
    const cd = fresh(st.debtsCache)
    const ci = fresh(st.inventoryCache)
    if (cs && cd && ci) {
      setSales(cs)
      setDebts(cd)
      setInventory(ci)
      setLoading(false)
      return
    }
    // Two weeks of sales: enough to show "this week" against "last week".
    const since = new Date(startOfDay(new Date()).getTime() - 13 * DAY).toISOString()
    const [s, d, i] = await Promise.all([
      supabase
        .from('sales')
        .select('*')
        .eq('business_id', activeBusiness.id)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1000),
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
    // The sales slice is two weeks, not the full ledger the Sales tab shows,
    // so only the two identical queries write back to the cache.
    if (s.data) setSales(s.data)
    if (d.data) { setDebts(d.data); st.setDebtsCache({ data: d.data, at: Date.now() }) }
    if (i.data) { setInventory(i.data); st.setInventoryCache({ data: i.data, at: Date.now() }) }
    setLoading(false)
  }, [activeBusiness])

  useEffect(() => { load() }, [load])

  // Reschedule debt notification whenever debt data updates
  const scheduledRef = useRef(false)
  useEffect(() => {
    if (debts.length === 0 && !scheduledRef.current) return
    scheduledRef.current = true
    const overdue = debts.filter(isOverdue)
    const amount = overdue.reduce((sum, d) => sum + (d.amount - d.amount_paid), 0)
    scheduleDebtReminder(overdue.length, amount).catch(() => {})
  }, [debts])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    // Drop the shared cache too, or the other tabs keep serving the stale rows
    // this pull-to-refresh was meant to replace.
    useStore.getState().clearCache()
    await load(true)
    setRefreshing(false)
  }, [load])

  // ── Period windows ──────────────────────────────────────────────
  const today0 = startOfDay(new Date())
  const tomorrow0 = new Date(today0.getTime() + DAY)
  const yesterday0 = new Date(today0.getTime() - DAY)
  const week0 = new Date(today0.getTime() - 6 * DAY)
  const lastWeek0 = new Date(week0.getTime() - 7 * DAY)

  const windows: Record<Period, { cur: [Date, Date]; prev: [Date, Date]; label: string; prevLabel: string }> = {
    today: { cur: [today0, tomorrow0], prev: [yesterday0, today0], label: 'Sales today', prevLabel: 'yesterday' },
    yesterday: { cur: [yesterday0, today0], prev: [new Date(yesterday0.getTime() - DAY), yesterday0], label: 'Sales yesterday', prevLabel: 'the day before' },
    week: { cur: [week0, tomorrow0], prev: [lastWeek0, week0], label: 'Sales this week', prevLabel: 'last week' },
  }
  const w = windows[period]
  const curSales = sales.filter((s) => between(s, w.cur[0], w.cur[1]))
  const prevSales = sales.filter((s) => between(s, w.prev[0], w.prev[1]))
  const revenue = curSales.reduce((sum, s) => sum + s.total, 0)
  const prevRevenue = prevSales.reduce((sum, s) => sum + s.total, 0)
  const cash = curSales.filter((s) => !s.is_debt).reduce((sum, s) => sum + s.total, 0)
  const credit = revenue - cash
  const changePct = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : null

  // ── Today's figures for the summary note (always today, whatever the switcher shows) ──
  const todaySales = sales.filter((s) => between(s, today0, tomorrow0))
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0)

  const overdueDebts = debts.filter(isOverdue)
  const totalOwed = debts.reduce((sum, d) => sum + (d.amount - d.amount_paid), 0)
  const lowStock = inventory.filter((i) => i.qty <= i.low_stock_threshold)
  const recentSales = sales.slice(0, 5)

  function buildDailySummary(): string {
    if (todaySales.length === 0) {
      if (overdueDebts.length > 0) {
        const amt = overdueDebts.reduce((sum, d) => sum + (d.amount - d.amount_paid), 0)
        return `No sales yet today. You have ${plural(overdueDebts.length, 'overdue debt')} worth ${naira(amt)} — consider chasing them.`
      }
      return 'No sales recorded yet today. Tap Record sale to get started.'
    }
    const parts: string[] = [`${plural(todaySales.length, 'sale')} today totalling ${naira(todayRevenue)}.`]
    if (overdueDebts.length > 0) {
      const amt = overdueDebts.reduce((sum, d) => sum + (d.amount - d.amount_paid), 0)
      parts.push(`${plural(overdueDebts.length, 'overdue debt')} worth ${naira(amt)} need chasing.`)
    } else if (totalOwed > 0) {
      parts.push(`${plural(debts.length, 'customer')} owe you ${naira(totalOwed)} total.`)
    }
    if (lowStock.length > 0) {
      parts.push(`Restock ${plural(lowStock.length, 'item')} soon.`)
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
  // "Shop / Provision Store" → "Shop": the eyebrow has one line.
  const typeLabel = BUSINESS_TYPES.find((b) => b.id === activeBusiness?.type)?.label.split(' / ')[0]
  const saleLabel = sentence(TAILORED[activeBusiness?.type as BusinessTypeId]?.saleLabel ?? 'Record sale')

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />}
      >
        {/* Greeting */}
        <View style={s.hello}>
          <View style={s.helloText}>
            <Txt variant="title" numberOfLines={1}>{greeting()}, {ownerName}</Txt>
            <Txt variant="label" numberOfLines={1}>
              {activeBusiness?.name}{typeLabel ? ` · ${typeLabel}` : ''}
            </Txt>
          </View>
          <Avatar
            name={ownerName}
            onPress={() => router.push('/settings')}
            accessibilityLabel="Settings"
          />
        </View>

        <Segmented options={PERIODS} value={period} onChange={setPeriod} />

        {/* The day's total, written straight onto the page */}
        <View style={s.hero}>
          <Txt variant="label">{w.label}</Txt>
          <Txt variant="display">{loading ? '—' : naira(revenue)}</Txt>
          {!loading && changePct !== null ? (
            <View style={s.compare}>
              <Ionicons
                name={changePct >= 0 ? 'trending-up-outline' : 'trending-down-outline'}
                size={15}
                color={changePct >= 0 ? T.green : T.error}
              />
              <Txt style={[s.compareText, { color: changePct >= 0 ? T.green : T.error }]}>
                {changePct >= 0 ? '+' : '−'}{Math.abs(changePct)}% on {w.prevLabel}
              </Txt>
            </View>
          ) : !loading && revenue > 0 ? (
            <Txt variant="meta">Nothing {w.prevLabel} to compare against</Txt>
          ) : null}
          {!loading ? (
            <Txt variant="meta">
              {plural(curSales.length, 'sale')} · <Txt style={s.metaMono}>{naira(cash)}</Txt> cash · <Txt style={s.metaMono}>{naira(credit)}</Txt> credit
            </Txt>
          ) : null}
        </View>

        {/* Primary actions */}
        <View style={s.actions}>
          <Button label={saleLabel} icon="add" size="lg" grow onPress={() => router.push('/sale/new')} />
          <Button label="Add debt" icon="people-outline" size="lg" variant="secondary" grow onPress={() => router.push('/debt/new' as any)} />
        </View>
        <View style={s.links}>
          <Button label="Add stock" variant="ghost" size="sm" icon="cube-outline" onPress={() => router.push('/inventory/new')} />
          <Button label="Import past sales" variant="ghost" size="sm" icon="camera-outline" onPress={() => router.push('/past-sales')} />
        </View>

        {/* KPIs */}
        <View style={s.kpis}>
          <StatTile
            label="Owed to you"
            value={loading ? '—' : naira(totalOwed)}
            meta={
              loading ? undefined
                : debts.length === 0 ? 'Nobody owes you'
                : overdueDebts.length > 0 ? `${overdueDebts.length} overdue of ${debts.length}`
                : `${plural(debts.length, 'customer')}, none overdue`
            }
            tone={overdueDebts.length > 0 ? 'bad' : debts.length > 0 ? 'neutral' : 'good'}
            onPress={() => router.push('/(tabs)/debts')}
          />
          <StatTile
            label="Low stock"
            value={loading ? '—' : plural(lowStock.length, 'item')}
            meta={
              loading ? undefined
                : inventory.length === 0 ? 'No stock tracked yet'
                : lowStock.length > 0 ? 'Restock soon'
                : 'All stocked up'
            }
            tone={lowStock.length > 0 ? 'warn' : inventory.length > 0 ? 'good' : 'neutral'}
            onPress={() => router.push('/(tabs)/inventory')}
          />
        </View>

        {/* Recent sales — the ledger */}
        <View style={s.section}>
          <SectionHeader title="Recent sales" action="All sales" onAction={() => router.push('/(tabs)/sales')} />
          {loading ? null : recentSales.length === 0 ? (
            <Card padded={false}>
              <EmptyState
                icon="receipt-outline"
                title="Nothing in the book yet"
                body="Record your first sale — it takes ten seconds."
              />
            </Card>
          ) : (
            <Card padded={false}>
              {recentSales.map((sale, idx) => (
                <ListRow
                  key={sale.id}
                  when={whenLabel(sale.created_at)}
                  title={sale.item}
                  meta={
                    <Txt variant="meta" numberOfLines={1}>
                      {sale.customer || 'Walk-in'}
                      {sale.is_debt ? <Txt style={s.onCredit}> · on credit</Txt> : null}
                    </Txt>
                  }
                  amount={naira(sale.total)}
                  amountColor={sale.is_debt ? T.warning : undefined}
                  last={idx === recentSales.length - 1}
                />
              ))}
            </Card>
          )}
        </View>

        {!loading ? <NoteCard text={buildDailySummary()} /> : null}
      </ScrollView>
    </Screen>
  )
}

const s = StyleSheet.create({
  content: { padding: SP.xl, gap: SP.lg, paddingBottom: SP.xxl },

  hello: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SP.md },
  helloText: { flex: 1, gap: 4 },

  hero: { gap: 4, paddingHorizontal: 2 },
  compare: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  compareText: { fontFamily: FONT.sansBold, fontSize: 13, lineHeight: 18 },
  metaMono: { fontFamily: FONT.mono, fontSize: 12, lineHeight: 16, color: T.textSub },

  actions: { flexDirection: 'row', gap: SP.sm },
  links: { flexDirection: 'row', gap: SP.xs, marginTop: -SP.sm, marginLeft: -SP.md },

  kpis: { flexDirection: 'row', gap: SP.sm },

  section: { gap: SP.sm },
  onCredit: { fontFamily: FONT.serifItalic, fontSize: 12, lineHeight: 16, color: T.error },
})
