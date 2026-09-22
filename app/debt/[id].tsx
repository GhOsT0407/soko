import { useState, useEffect, useCallback } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Share,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { T, SP, FONT } from '@/constants/theme'
import { naira, whenLabel, daysSince } from '@/lib/format'
import { balanceOf, isOverdue, statusOf, dueLabel, dueDateFromDays, whatsappUrl } from '@/lib/debts'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'
import type { Debt, DebtPayment } from '@/types'
import {
  Screen, Txt, Card, Button, IconButton, Input, Badge, Chip, ListRow, SectionHeader, EmptyState,
  ModalHeader, ModalFooter,
} from '@/components'

type Terms = '7' | '14' | '30' | 'clear'
const TERMS: { key: Terms; label: string }[] = [
  { key: '7', label: '1 week' },
  { key: '14', label: '2 weeks' },
  { key: '30', label: '1 month' },
  { key: 'clear', label: 'No date' },
]

function ago(dateStr: string) {
  const n = daysSince(dateStr)
  if (n === 0) return 'added today'
  if (n === 1) return 'added yesterday'
  return `added ${n} days ago`
}

export default function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const session = useStore((s) => s.session)
  const activeBusiness = useStore((s) => s.activeBusiness)

  const [debt, setDebt] = useState<Debt | null>(null)
  const [payments, setPayments] = useState<DebtPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [payAmount, setPayAmount] = useState('')
  const [payNote, setPayNote] = useState('')
  const [paying, setPaying] = useState(false)
  const [showPayForm, setShowPayForm] = useState(false)
  const [showDueForm, setShowDueForm] = useState(false)

  const load = useCallback(async () => {
    const [d, p] = await Promise.all([
      supabase.from('debts').select('*').eq('id', id).single(),
      supabase.from('debt_payments').select('*').eq('debt_id', id).order('created_at', { ascending: false }),
    ])
    if (d.data) setDebt(d.data)
    if (p.data) setPayments(p.data)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function handlePayment() {
    const amount = parseFloat(payAmount)
    if (!amount || amount <= 0 || !debt || !session) return
    const balance = balanceOf(debt)
    if (amount > balance) {
      Alert.alert('Too much', `Balance is only ${naira(balance)}`)
      return
    }

    setPaying(true)
    try {
      const newPaid = debt.amount_paid + amount
      const paid = newPaid >= debt.amount

      await Promise.all([
        supabase.from('debt_payments').insert({
          debt_id: debt.id,
          user_id: session.user.id,
          amount,
          note: payNote.trim(),
        }),
        supabase.from('debts').update({ amount_paid: newPaid, paid }).eq('id', debt.id),
      ])

      useStore.getState().clearCache()
      if (paid) {
        Alert.alert('Fully paid', `${debt.customer} has paid in full.`, [
          { text: 'OK', onPress: () => router.back() },
        ])
      } else {
        setPayAmount('')
        setPayNote('')
        setShowPayForm(false)
        await load()
      }
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setPaying(false)
    }
  }

  function handleMarkPaid() {
    if (!debt) return
    Alert.alert('Mark as fully paid?', `This will clear ${debt.customer}'s debt.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark paid',
        onPress: async () => {
          await supabase.from('debts').update({ paid: true, amount_paid: debt.amount }).eq('id', debt.id)
          useStore.getState().clearCache()
          router.back()
        },
      },
    ])
  }

  async function setDue(t: Terms) {
    if (!debt) return
    const due_date = t === 'clear' ? null : dueDateFromDays(parseInt(t))
    const { error } = await supabase.from('debts').update({ due_date }).eq('id', debt.id)
    if (error) { Alert.alert('Error', error.message); return }
    useStore.getState().clearCache()
    setShowDueForm(false)
    setDebt({ ...debt, due_date })
  }

  function sendWhatsApp() {
    if (!debt) return
    const bizName = activeBusiness?.name || 'your supplier'
    const msg = `Hello ${debt.customer}, this is ${bizName}.\n\nYou still owe *₦${balanceOf(debt).toLocaleString()}*${debt.description ? ` for ${debt.description}` : ''}.\n\nPlease pay when convenient. Thank you! 🙏`
    Linking.openURL(whatsappUrl(debt.phone, msg))
  }

  async function shareBalance() {
    if (!debt) return
    const bizName = activeBusiness?.name || 'your supplier'
    const date = new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
    const text = `*Balance from ${bizName}*\n\nCustomer: ${debt.customer}${debt.description ? `\nFor: ${debt.description}` : ''}\n\nTotal owed: ₦${debt.amount.toLocaleString()}\nPaid so far: ₦${debt.amount_paid.toLocaleString()}\nBalance due: ₦${balanceOf(debt).toLocaleString()}\n\nAs of ${date}`
    try { await Share.share({ message: text }) } catch {}
  }

  function handleDelete() {
    Alert.alert('Delete debt?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('debts').delete().eq('id', id)
          useStore.getState().clearCache()
          router.back()
        },
      },
    ])
  }

  if (loading) {
    return (
      <Screen>
        <ModalHeader title="Debt" />
        <ActivityIndicator style={s.spinner} color={T.accent} />
      </Screen>
    )
  }

  if (!debt) {
    return (
      <Screen>
        <ModalHeader title="Debt" />
        <EmptyState icon="search-outline" title="Debt not found" body="It may have been deleted." />
      </Screen>
    )
  }

  const balance = balanceOf(debt)
  const paidPct = debt.amount > 0 ? Math.min((debt.amount_paid / debt.amount) * 100, 100) : 0
  const overdue = isOverdue(debt)
  const st = statusOf(debt)
  const due = dueLabel(debt)
  const metaBits = [ago(debt.created_at), due, debt.phone].filter(Boolean)

  return (
    <Screen>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ModalHeader
          title={debt.customer}
          right={<IconButton icon="trash-outline" size={36} color={T.error} onPress={handleDelete} accessibilityLabel="Delete debt" />}
        />

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* The figure, written on the page */}
          <View style={s.hero}>
            <View style={s.heroTop}>
              <Txt variant="label">Balance due</Txt>
              <Badge label={st.label} tone={st.tone} />
            </View>
            <Txt variant="display" color={overdue ? T.error : T.text}>{naira(balance)}</Txt>
            {debt.description ? <Txt variant="note">{debt.description}</Txt> : null}
            <Txt variant="meta" color={overdue ? T.error : T.muted}>{metaBits.join(' · ')}</Txt>

            {debt.amount_paid > 0 ? (
              <View style={s.progress}>
                <View style={s.track}>
                  <View style={[s.fill, { width: `${paidPct}%` }]} />
                </View>
                <Txt variant="meta">
                  <Txt style={s.paid}>{naira(debt.amount_paid)}</Txt> paid of {naira(debt.amount)}
                </Txt>
              </View>
            ) : null}
          </View>

          {/* Record payment */}
          {showPayForm ? (
            <Card style={s.form}>
              <Txt variant="heading">Record payment</Txt>
              <Input
                label="Amount (₦)"
                mono large
                keyboardType="numeric"
                value={payAmount}
                onChangeText={setPayAmount}
                placeholder={`Up to ${naira(balance)}`}
                autoFocus
              />
              <Input
                label="Note (optional)"
                value={payNote}
                onChangeText={setPayNote}
                placeholder="e.g. Cash, Transfer"
              />
              <View style={s.row}>
                <Button
                  label="Cancel"
                  variant="secondary"
                  grow
                  onPress={() => { setShowPayForm(false); setPayAmount(''); setPayNote('') }}
                />
                <Button
                  label="Confirm"
                  grow
                  onPress={handlePayment}
                  disabled={!(parseFloat(payAmount) > 0)}
                  loading={paying}
                  style={s.grow2}
                />
              </View>
            </Card>
          ) : (
            <View style={s.actions}>
              <Button label="Mark fully paid" icon="checkmark-circle-outline" variant="secondary" size="lg" onPress={handleMarkPaid} />
              {debt.phone ? (
                <Button label="Send WhatsApp reminder" icon="logo-whatsapp" variant="secondary" size="lg" onPress={sendWhatsApp} />
              ) : null}
              <Button label="Share balance" icon="share-outline" variant="ghost" onPress={shareBalance} />
            </View>
          )}

          {/* Due date */}
          <Card padded={false}>
            <ListRow
              title={debt.due_date
                ? `Due ${new Date(debt.due_date + 'T00:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}`
                : 'No due date'}
              meta={due ?? 'Counts as overdue after a week'}
              trailing={
                <IconButton
                  icon={showDueForm ? 'chevron-up' : 'calendar-outline'}
                  size={36}
                  onPress={() => setShowDueForm((v) => !v)}
                  accessibilityLabel="Change due date"
                />
              }
              last={!showDueForm}
            />
            {showDueForm ? (
              <View style={s.dueChips}>
                {TERMS.map((t) => (
                  <Chip key={t.key} label={t.label} grow onPress={() => setDue(t.key)} />
                ))}
              </View>
            ) : null}
          </Card>

          {/* Payment ledger */}
          <View style={s.gapSm}>
            <SectionHeader title="Payments" />
            <Card padded={false}>
              {payments.length === 0 ? (
                <EmptyState icon="receipt-outline" title="Nothing paid yet" body="Payments you record will be listed here." />
              ) : (
                payments.map((p, idx) => (
                  <ListRow
                    key={p.id}
                    when={whenLabel(p.created_at)}
                    title={p.note || 'Payment'}
                    amount={naira(p.amount)}
                    amountColor={T.green}
                    last={idx === payments.length - 1}
                  />
                ))
              )}
            </Card>
          </View>
        </ScrollView>

        {!showPayForm ? (
          <ModalFooter>
            <Button label="Record payment" icon="cash-outline" size="lg" grow onPress={() => setShowPayForm(true)} />
          </ModalFooter>
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  )
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  spinner: { marginTop: 40 },
  scroll: { padding: SP.xl, gap: SP.lg },
  gapSm: { gap: SP.sm },
  row: { flexDirection: 'row', gap: SP.md },
  grow2: { flex: 2 },

  hero: { gap: SP.xs, paddingHorizontal: 2 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progress: { gap: 6, marginTop: SP.sm },
  track: { height: 4, borderRadius: 2, backgroundColor: T.surfaceHigh, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: T.green, borderRadius: 2 },
  paid: { fontFamily: FONT.monoBold, fontSize: 12, lineHeight: 16, color: T.green },

  actions: { gap: SP.sm },
  form: { gap: SP.lg },
  dueChips: { flexDirection: 'row', gap: SP.sm, padding: SP.md, paddingTop: 0 },
})
