import { useState, useCallback } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl, Linking } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { T, SP } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { naira, daysSince, plural } from '@/lib/format'
import { useStore } from '@/store'
import type { Debt } from '@/types'
import {
  Screen, Txt, Card, IconButton, Badge, Segmented, ListRow, EmptyState, ScreenHeader, Avatar,
  type BadgeTone,
} from '@/components'

type Filter = 'all' | 'overdue' | 'partial' | 'pending'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'partial', label: 'Partial' },
  { key: 'pending', label: 'Pending' },
]

function balance(d: Debt) { return d.amount - d.amount_paid }

function sendWhatsApp(debt: Debt) {
  const bal = debt.amount - debt.amount_paid
  const msg = `Hello ${debt.customer}, you still owe *₦${bal.toLocaleString()}*${debt.description ? ` for ${debt.description}` : ''}. Please pay when convenient. Thank you! 🙏`
  const raw = (debt.phone || '').replace(/\D/g, '')
  const phone = raw.startsWith('0') ? '234' + raw.slice(1) : raw
  Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`)
}

function statusOf(d: Debt): { label: string; tone: BadgeTone } {
  if (d.amount_paid > 0 && d.amount_paid < d.amount) return { label: 'Partial', tone: 'warn' }
  if (daysSince(d.created_at) > 7) return { label: 'Overdue', tone: 'bad' }
  return { label: 'Pending', tone: 'neutral' }
}

function ago(dateStr: string) {
  const n = daysSince(dateStr)
  if (n === 0) return 'today'
  if (n === 1) return 'yesterday'
  return `${n} days ago`
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

  return (
    <Screen>
      <ScreenHeader
        title="Debts"
        right={<IconButton icon="add" variant="primary" onPress={() => router.push('/debt/new' as any)} accessibilityLabel="Add debt" />}
      />

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />}
      >
        {/* The figure that matters, written on the page */}
        <View style={s.hero}>
          <Txt variant="label">Owed to you</Txt>
          <Txt variant="display">{naira(totalOwed)}</Txt>
          <Txt variant="meta">
            {debts.length === 0
              ? 'Nobody owes you anything right now'
              : `${plural(debts.length, 'customer')}${overdueCount > 0 ? ` · ${overdueCount} overdue` : ' · none overdue'}`}
          </Txt>
        </View>

        <Segmented options={FILTERS} value={filter} onChange={setFilter} />

        {filtered.length === 0 ? (
          <Card padded={false}>
            <EmptyState
              icon="checkmark-circle-outline"
              tone="good"
              title="All clear"
              body={filter === 'all' ? 'Every debt has been settled.' : 'No debts in this category.'}
            />
          </Card>
        ) : (
          <Card padded={false}>
            {filtered.map((debt, idx) => {
              const st = statusOf(debt)
              return (
                <ListRow
                  key={debt.id}
                  leading={<Avatar name={debt.customer} tone="quiet" size={36} />}
                  title={debt.customer}
                  titleRight={<Badge label={st.label} tone={st.tone} />}
                  meta={[debt.description, ago(debt.created_at)].filter(Boolean).join(' · ')}
                  amount={naira(balance(debt))}
                  sub={debt.amount_paid > 0 ? <Txt style={s.paid}>paid {naira(debt.amount_paid)}</Txt> : undefined}
                  trailing={
                    debt.phone ? (
                      <IconButton
                        icon="logo-whatsapp"
                        size={36}
                        color={T.whatsapp}
                        onPress={() => sendWhatsApp(debt)}
                        accessibilityLabel={`Remind ${debt.customer} on WhatsApp`}
                      />
                    ) : (
                      // Keep the amount column aligned on rows with no number to message
                      <View style={s.noPhone} />
                    )
                  }
                  onPress={() => router.push(`/debt/${debt.id}` as any)}
                  last={idx === filtered.length - 1}
                />
              )
            })}
          </Card>
        )}
      </ScrollView>
    </Screen>
  )
}

const s = StyleSheet.create({
  content: { paddingHorizontal: SP.xl, gap: SP.md, paddingBottom: SP.xxl },
  hero: { gap: 4, paddingHorizontal: 2, paddingBottom: SP.xs },
  paid: { fontSize: 11, lineHeight: 14, color: T.green },
  noPhone: { width: 36 },
})
