import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  Share,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { T, FONT } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'
import type { Debt, DebtPayment } from '@/types'

function fmt(n: number) { return '₦' + n.toLocaleString() }

function daysSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
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
    const balance = debt.amount - debt.amount_paid
    if (amount > balance) {
      Alert.alert('Too much', `Balance is only ${fmt(balance)}`)
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
        supabase.from('debts').update({
          amount_paid: newPaid,
          paid,
        }).eq('id', debt.id),
      ])

      if (paid) {
        useStore.getState().clearCache()
        Alert.alert('Fully Paid!', `${debt.customer} has paid in full.`, [
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

  async function handleMarkPaid() {
    if (!debt) return
    Alert.alert('Mark as fully paid?', `This will clear ${debt.customer}'s debt.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Paid',
        onPress: async () => {
          await supabase.from('debts').update({ paid: true, amount_paid: debt.amount }).eq('id', debt.id)
          useStore.getState().clearCache()
          router.back()
        },
      },
    ])
  }

  function sendWhatsApp() {
    if (!debt) return
    const bal = debt.amount - debt.amount_paid
    const bizName = activeBusiness?.name || 'your supplier'
    const msg = `Hello ${debt.customer}, this is ${bizName}.\n\nYou still owe *₦${bal.toLocaleString()}*${debt.description ? ` for ${debt.description}` : ''}.\n\nPlease pay when convenient. Thank you! 🙏`
    const raw = (debt.phone || '').replace(/\D/g, '')
    const phone = raw.startsWith('0') ? '234' + raw.slice(1) : raw
    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`)
  }

  async function shareBalance() {
    if (!debt) return
    const bal = debt.amount - debt.amount_paid
    const bizName = activeBusiness?.name || 'your supplier'
    const date = new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
    const text = `*Balance from ${bizName}*\n\nCustomer: ${debt.customer}${debt.description ? `\nFor: ${debt.description}` : ''}\n\nTotal owed: ₦${debt.amount.toLocaleString()}\nPaid so far: ₦${debt.amount_paid.toLocaleString()}\nBalance due: ₦${bal.toLocaleString()}\n\nAs of ${date}`
    try { await Share.share({ message: text }) } catch {}
  }

  async function handleDelete() {
    Alert.alert('Delete debt?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('debts').delete().eq('id', id)
          router.back()
        },
      },
    ])
  }

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator style={{ marginTop: 40 }} color={T.accent} />
      </SafeAreaView>
    )
  }

  if (!debt) {
    return (
      <SafeAreaView style={s.container}>
        <Text style={{ padding: 20, color: T.muted }}>Debt not found.</Text>
      </SafeAreaView>
    )
  }

  const balance = debt.amount - debt.amount_paid
  const paidPercent = debt.amount > 0 ? (debt.amount_paid / debt.amount) * 100 : 0
  const isOverdue = daysSince(debt.created_at) > 7 && !debt.paid

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={T.muted} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{debt.customer}</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={18} color={T.error} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Balance card */}
        <View style={[s.balanceCard, isOverdue && s.balanceCardOverdue]}>
          <Text style={s.balanceLabel}>BALANCE DUE</Text>
          <Text style={s.balanceAmount}>{fmt(balance)}</Text>
          {debt.description ? <Text style={s.balanceDesc}>{debt.description}</Text> : null}

          {/* Progress bar */}
          {debt.amount_paid > 0 && (
            <View style={s.progressWrap}>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${Math.min(paidPercent, 100)}%` as any }]} />
              </View>
              <Text style={s.progressText}>
                {fmt(debt.amount_paid)} paid of {fmt(debt.amount)}
              </Text>
            </View>
          )}

          <View style={s.metaRow}>
            {isOverdue && (
              <View style={[s.badge, { backgroundColor: T.errorLight }]}>
                <Text style={[s.badgeText, { color: T.error }]}>OVERDUE</Text>
              </View>
            )}
            <Text style={s.metaDate}>{daysSince(debt.created_at)} days ago</Text>
            {debt.phone ? <Text style={s.metaPhone}>{debt.phone}</Text> : null}
          </View>
        </View>

        {/* Payment form */}
        {!showPayForm ? (
          <View style={s.actions}>
            <TouchableOpacity style={s.payBtn} onPress={() => setShowPayForm(true)} activeOpacity={0.85}>
              <Ionicons name="cash-outline" size={18} color="#fff" />
              <Text style={s.payBtnText}>Record Payment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.paidBtn} onPress={handleMarkPaid} activeOpacity={0.85}>
              <Ionicons name="checkmark-circle-outline" size={18} color={T.green} />
              <Text style={s.paidBtnText}>Mark Fully Paid</Text>
            </TouchableOpacity>
            {debt.phone ? (
              <TouchableOpacity style={s.waBtn} onPress={sendWhatsApp} activeOpacity={0.85}>
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                <Text style={s.waBtnText}>Send WhatsApp Reminder</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={s.shareBtn} onPress={shareBalance} activeOpacity={0.85}>
              <Ionicons name="share-outline" size={18} color={T.muted} />
              <Text style={s.shareBtnText}>Share Balance</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.payForm}>
            <Text style={s.payFormTitle}>Record Payment</Text>
            <View style={s.field}>
              <Text style={s.label}>AMOUNT (₦)</Text>
              <TextInput
                style={[s.input, payAmount.length > 0 && s.inputActive]}
                keyboardType="numeric"
                value={payAmount}
                onChangeText={setPayAmount}
                placeholder={`Max ${fmt(balance)}`}
                placeholderTextColor={T.faint}
                autoFocus
              />
            </View>
            <View style={s.field}>
              <Text style={s.label}>NOTE (OPTIONAL)</Text>
              <TextInput
                style={[s.input, payNote.length > 0 && s.inputActive]}
                value={payNote}
                onChangeText={setPayNote}
                placeholder="e.g. Cash, Transfer"
                placeholderTextColor={T.faint}
              />
            </View>
            <View style={s.payFormRow}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => { setShowPayForm(false); setPayAmount(''); setPayNote('') }}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, (!payAmount || paying) && s.confirmBtnDisabled]}
                onPress={handlePayment}
                disabled={!payAmount || paying}
              >
                {paying ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.confirmBtnText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Payment history */}
        {payments.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>PAYMENT HISTORY</Text>
            <View style={s.paymentList}>
              {payments.map((p, idx) => (
                <View
                  key={p.id}
                  style={[s.paymentRow, idx === payments.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View style={s.paymentLeft}>
                    <Text style={s.paymentAmount}>{fmt(p.amount)}</Text>
                    {p.note ? <Text style={s.paymentNote}>{p.note}</Text> : null}
                  </View>
                  <Text style={s.paymentDate}>
                    {new Date(p.created_at).toLocaleDateString('en-NG', {
                      day: 'numeric', month: 'short',
                    })}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: T.text, flex: 1, textAlign: 'center' },

  balanceCard: {
    margin: 20,
    backgroundColor: T.dark,
    borderRadius: 18,
    padding: 20,
    gap: 8,
  },
  balanceCardOverdue: { backgroundColor: '#1C0505' },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
    fontFamily: FONT.mono,
  },
  balanceAmount: { fontSize: 40, fontWeight: '900', color: '#fff', letterSpacing: -1.5 },
  balanceDesc: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  progressWrap: { gap: 6, marginTop: 4 },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: T.green, borderRadius: 2 },
  progressText: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  badge: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, fontFamily: FONT.mono },
  metaDate: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  metaPhone: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' },

  actions: { paddingHorizontal: 20, gap: 10 },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: T.accent,
    borderRadius: 14,
    paddingVertical: 15,
  },
  payBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  paidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: T.greenLight,
    borderRadius: 14,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: T.green + '44',
  },
  paidBtnText: { color: T.green, fontWeight: '700', fontSize: 15 },
  waBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E7FAF0',
    borderRadius: 14,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#25D36633',
  },
  waBtnText: { color: '#128C7E', fontWeight: '700', fontSize: 15 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: T.surface,
    borderRadius: 14,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: T.border,
  },
  shareBtnText: { color: T.muted, fontWeight: '700', fontSize: 15 },

  payForm: {
    marginHorizontal: 20,
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    gap: 14,
  },
  payFormTitle: { fontSize: 15, fontWeight: '700', color: T.text },
  field: { gap: 7 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: T.muted,
    letterSpacing: 1.5,
    fontFamily: FONT.mono,
  },
  input: {
    backgroundColor: T.bg,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: T.text,
  },
  inputActive: { borderColor: T.accent },
  payFormRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    backgroundColor: T.bg,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: { color: T.muted, fontWeight: '600' },
  confirmBtn: {
    flex: 2,
    backgroundColor: T.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { color: '#fff', fontWeight: '700' },

  section: { padding: 20, paddingTop: 24, gap: 10 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: T.muted,
    letterSpacing: 1.5,
    fontFamily: FONT.mono,
  },
  paymentList: {
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  paymentLeft: { gap: 2 },
  paymentAmount: { fontSize: 15, fontWeight: '700', color: T.green },
  paymentNote: { fontSize: 12, color: T.muted },
  paymentDate: { fontSize: 12, color: T.faint },
})
