import { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Share,
  Pressable,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { T, SP } from '@/constants/theme'
import { naira } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'
import {
  Screen, Txt, Card, Button, Input, Segmented, Chip, ToggleRow, ModalHeader, ModalFooter, Badge,
} from '@/components'

type Mode = 'single' | 'day'
type DayPick = 'Today' | 'Yesterday' | 'Earlier'

const MODES: { key: Mode; label: string }[] = [
  { key: 'single', label: 'Per sale' },
  { key: 'day', label: 'Per day' },
]
const DAYS: DayPick[] = ['Today', 'Yesterday', 'Earlier']

type Suggestion = { item: string; price: number }
type Snap =
  | { mode: 'single'; item: string; total: number; isDebt: boolean; customer: string }
  | { mode: 'day'; date: string; total: number; count: string }

export default function NewSaleScreen() {
  const activeBusiness = useStore((s) => s.activeBusiness)
  const session = useStore((s) => s.session)

  const [item, setItem] = useState('')
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState('')
  const [customer, setCustomer] = useState('')
  const [isDebt, setIsDebt] = useState(false)
  const [saving, setSaving] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [topItems, setTopItems] = useState<Suggestion[]>([])

  const [saleMode, setSaleMode] = useState<Mode>('single')
  const [dayDate, setDayDate] = useState<DayPick>('Today')
  const [dayDaysAgo, setDayDaysAgo] = useState('2')
  const [dayCash, setDayCash] = useState('')
  const [dayDebt, setDayDebt] = useState('')
  const [dayCount, setDayCount] = useState('')
  const [dayNote, setDayNote] = useState('')
  const [savedSnap, setSavedSnap] = useState<Snap | null>(null)

  useEffect(() => {
    if (!activeBusiness) return
    supabase
      .from('sales')
      .select('item, price')
      .eq('business_id', activeBusiness.id)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (!data) return
        const freq = new Map<string, { price: number; count: number }>()
        data.forEach((r) => {
          const ex = freq.get(r.item)
          if (ex) ex.count++
          else freq.set(r.item, { price: r.price, count: 1 })
        })
        setTopItems(
          Array.from(freq.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 6)
            .map(([name, { price }]) => ({ item: name, price }))
        )
      })
  }, [activeBusiness])

  useEffect(() => {
    if (item.trim().length < 2 || !activeBusiness) {
      setSuggestions([])
      return
    }
    supabase
      .from('sales')
      .select('item, price')
      .eq('business_id', activeBusiness.id)
      .ilike('item', `%${item.trim()}%`)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!data) return
        const seen = new Map<string, number>()
        data.forEach((r) => { if (!seen.has(r.item)) seen.set(r.item, r.price) })
        setSuggestions(
          Array.from(seen.entries()).map(([item, price]) => ({ item, price })).slice(0, 5)
        )
        setShowSuggestions(true)
      })
  }, [item])

  function pickSuggestion(sg: Suggestion) {
    setItem(sg.item)
    setPrice(String(sg.price))
    setShowSuggestions(false)
  }

  async function handleShareReceipt() {
    let text: string
    if (savedSnap?.mode === 'day') {
      text = `*Daily Summary — ${activeBusiness?.name}*\n\n📅 ${savedSnap.date}\n💰 ₦${savedSnap.total.toLocaleString()}${savedSnap.count ? `\n🧾 ${savedSnap.count} sales` : ''}\n\nThank you for your business! 🙏`
    } else if (savedSnap) {
      const date = new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
      text = `*Receipt — ${activeBusiness?.name}*\n\n📦 ${savedSnap.item}\n💰 ₦${savedSnap.total.toLocaleString()}\n📅 ${date}${savedSnap.customer ? `\n👤 ${savedSnap.customer}` : ''}\n\nThank you for your business! 🙏`
    } else {
      return
    }
    try { await Share.share({ message: text }) } catch {}
  }

  const total = (parseFloat(qty) || 0) * (parseFloat(price) || 0)
  const canSave = item.trim().length > 0 && parseFloat(price) > 0

  const dayTotal = (parseFloat(dayCash) || 0) + (parseFloat(dayDebt) || 0)
  const canSaveDay = dayTotal > 0

  const activeTotal = saleMode === 'day' ? dayTotal : total
  const activeCanSave = saleMode === 'day' ? canSaveDay : canSave

  function resetForm() {
    setItem(''); setQty('1'); setPrice('')
    setCustomer(''); setIsDebt(false)
    setDayDate('Today'); setDayDaysAgo('2')
    setDayCash(''); setDayDebt(''); setDayCount(''); setDayNote('')
  }

  async function handleSave() {
    if (saleMode === 'day') await handleSaveDay()
    else await handleSaveSingle()
  }

  async function handleSaveSingle() {
    if (!canSave || !activeBusiness || !session) return
    setSaving(true)
    try {
      const { data: sale, error } = await supabase
        .from('sales')
        .insert({
          business_id: activeBusiness.id,
          user_id: session.user.id,
          item: item.trim(),
          category: 'General',
          qty: parseFloat(qty) || 1,
          price: parseFloat(price),
          total,
          customer: customer.trim(),
          is_debt: isDebt,
          notes: '',
        })
        .select()
        .single()

      if (error) throw error

      if (isDebt && sale) {
        await supabase.from('debts').insert({
          business_id: activeBusiness.id,
          user_id: session.user.id,
          sale_id: sale.id,
          customer: customer.trim() || 'Unknown customer',
          phone: '',
          amount: total,
          amount_paid: 0,
          description: item.trim(),
        })
      }

      useStore.getState().clearCache()
      setSavedSnap({ mode: 'single', item: item.trim(), total, isDebt, customer: customer.trim() })
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save sale.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveDay() {
    if (!canSaveDay || !activeBusiness || !session) return
    setSaving(true)
    try {
      const cash = parseFloat(dayCash) || 0
      const debt = parseFloat(dayDebt) || 0
      const daysAgo = dayDate === 'Today' ? 0 : dayDate === 'Yesterday' ? 1 : (parseInt(dayDaysAgo) || 2)
      const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString()
      const count = parseInt(dayCount) || 0
      const label = `Daily sales${count > 0 ? ` (${count} sales)` : ''}`

      if (cash > 0) {
        await supabase.from('sales').insert({
          business_id: activeBusiness.id,
          user_id: session.user.id,
          item: label,
          category: 'General',
          qty: count > 0 ? count : 1,
          price: count > 0 ? cash / count : cash,
          total: cash,
          customer: '',
          is_debt: false,
          notes: dayNote.trim(),
          created_at: createdAt,
        })
      }

      if (debt > 0) {
        const { data: sale } = await supabase
          .from('sales')
          .insert({
            business_id: activeBusiness.id,
            user_id: session.user.id,
            item: `${label} (on credit)`,
            category: 'General',
            qty: 1,
            price: debt,
            total: debt,
            customer: '',
            is_debt: true,
            notes: dayNote.trim(),
            created_at: createdAt,
          })
          .select()
          .single()

        await supabase.from('debts').insert({
          business_id: activeBusiness.id,
          user_id: session.user.id,
          sale_id: sale?.id,
          customer: 'Multiple customers',
          phone: '',
          amount: debt,
          amount_paid: 0,
          description: dayNote.trim() || 'Day total on credit',
          created_at: createdAt,
        })
      }

      useStore.getState().clearCache()
      setSavedSnap({ mode: 'day', date: dayDate, total: dayTotal, count: dayCount })
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save day total.')
    } finally {
      setSaving(false)
    }
  }

  // ── Saved: the receipt, written on the page ─────────────────────
  if (savedSnap) {
    const line = savedSnap.mode === 'day'
      ? (savedSnap.count ? `${savedSnap.count} sales · ${savedSnap.date}` : savedSnap.date)
      : savedSnap.item
    return (
      <Screen edges={['top', 'bottom']}>
        <View style={s.done}>
          <View style={s.doneDisc}>
            <Ionicons name="checkmark" size={34} color={T.green} />
          </View>
          <Txt variant="title" align="center">{savedSnap.mode === 'day' ? 'Day recorded' : 'Sale recorded'}</Txt>
          <Txt variant="meta" align="center">{line}</Txt>
          <Txt variant="display" color={T.green} align="center" style={s.doneAmount}>{naira(savedSnap.total)}</Txt>
          {savedSnap.mode === 'single' && savedSnap.isDebt ? (
            <Badge label={`Debt added for ${savedSnap.customer || 'customer'}`} tone="warn" />
          ) : null}
          <Button
            label="Share receipt"
            icon="share-social-outline"
            variant="secondary"
            onPress={handleShareReceipt}
            style={s.doneShare}
          />
        </View>
        <ModalFooter>
          <Button label="Done" variant="secondary" size="lg" grow onPress={() => router.back()} />
          <Button label="Record another" size="lg" grow onPress={() => { resetForm(); setSavedSnap(null) }} style={s.grow2} />
        </ModalFooter>
      </Screen>
    )
  }

  // ── The form ────────────────────────────────────────────────────
  return (
    <Screen>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ModalHeader title="Record sale" />

        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.gapSm}>
            <Segmented options={MODES} value={saleMode} onChange={setSaleMode} />
            <Txt variant="meta" style={s.hint}>
              {saleMode === 'day'
                ? 'Already sold today? Enter the day’s takings in one entry.'
                : 'Log each item as you sell it, with an optional customer.'}
            </Txt>
          </View>

          {saleMode === 'day' ? (
            <>
              <View style={s.gapSm}>
                <Txt variant="label">Which day</Txt>
                <View style={s.chips}>
                  {DAYS.map((d) => (
                    <Chip key={d} label={d} grow selected={dayDate === d} onPress={() => setDayDate(d)} />
                  ))}
                </View>
                {dayDate === 'Earlier' ? (
                  <Input
                    mono
                    keyboardType="numeric"
                    value={dayDaysAgo}
                    onChangeText={setDayDaysAgo}
                    placeholder="Days ago, e.g. 3"
                  />
                ) : null}
              </View>

              <View style={s.row}>
                <Input
                  label="Cash sales (₦)"
                  labelColor={T.green}
                  mono large
                  keyboardType="numeric"
                  value={dayCash}
                  onChangeText={setDayCash}
                  placeholder="0"
                  containerStyle={s.grow}
                />
                <Input
                  label="On credit (₦)"
                  labelColor={T.warning}
                  mono large
                  keyboardType="numeric"
                  value={dayDebt}
                  onChangeText={setDayDebt}
                  placeholder="0"
                  containerStyle={s.grow}
                />
              </View>

              {dayTotal > 0 ? <TotalLine label="Day total" value={naira(dayTotal)} /> : null}

              <Input
                label="Number of sales (optional)"
                mono
                keyboardType="numeric"
                value={dayCount}
                onChangeText={setDayCount}
                placeholder="e.g. 12"
              />
              <Input
                label="Note (optional)"
                value={dayNote}
                onChangeText={setDayNote}
                placeholder="e.g. Market day, busy morning"
              />
            </>
          ) : (
            <>
              {topItems.length > 0 && !item ? (
                <View style={s.gapSm}>
                  <Txt variant="label">Quick add</Txt>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
                    {topItems.map((qi) => (
                      <Chip key={qi.item} label={qi.item} sub={naira(qi.price)} onPress={() => pickSuggestion(qi)} />
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              <View>
                <Input
                  label="Item / service"
                  placeholder="e.g. Rice 50kg, Haircut, Fabric"
                  value={item}
                  onChangeText={(v) => { setItem(v); setShowSuggestions(true) }}
                  returnKeyType="next"
                />
                {showSuggestions && suggestions.length > 0 ? (
                  <Card padded={false} style={s.suggestions}>
                    {suggestions.map((sg, idx) => (
                      <Pressable
                        key={sg.item}
                        onPress={() => pickSuggestion(sg)}
                        style={({ pressed }) => [s.suggestion, idx === suggestions.length - 1 && s.suggestionLast, pressed && s.pressed]}
                      >
                        <Txt variant="body" numberOfLines={1} style={s.grow}>{sg.item}</Txt>
                        <Txt variant="amount" color={T.accent}>{naira(sg.price)}</Txt>
                      </Pressable>
                    ))}
                  </Card>
                ) : null}
              </View>

              <View style={s.row}>
                <Input
                  label="Qty"
                  mono large
                  keyboardType="numeric"
                  value={qty}
                  onChangeText={setQty}
                  placeholder="1"
                  containerStyle={s.grow}
                />
                <Input
                  label="Unit price (₦)"
                  mono large
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0"
                  containerStyle={s.grow2}
                />
              </View>

              {total > 0 ? <TotalLine label="Total" value={naira(total)} /> : null}

              <Input
                label="Customer (optional)"
                placeholder="Name or phone number"
                value={customer}
                onChangeText={setCustomer}
              />

              <ToggleRow
                icon="document-text-outline"
                title="Record as debt"
                sub="Customer will pay later"
                tone="warn"
                value={isDebt}
                onChange={setIsDebt}
              />
            </>
          )}
        </ScrollView>

        <ModalFooter>
          <Button
            grow
            size="lg"
            onPress={handleSave}
            disabled={!activeCanSave}
            loading={saving}
            label={
              activeCanSave
                ? `Save  ${naira(activeTotal)}`
                : saleMode === 'day' ? 'Enter your takings' : 'Enter item & price'
            }
          />
        </ModalFooter>
      </KeyboardAvoidingView>
    </Screen>
  )
}

// The running total, set in the accent wash so it's the one thing that
// changes colour as the form is filled.
function TotalLine({ label, value }: { label: string; value: string }) {
  return (
    <Card tone="accent" style={s.total}>
      <Txt variant="label" color={T.accentDark}>{label}</Txt>
      <Txt variant="amountLg" color={T.accentDark} style={s.totalValue}>{value}</Txt>
    </Card>
  )
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: SP.xl, gap: SP.xl },
  gapSm: { gap: SP.sm },
  hint: { paddingHorizontal: 2 },
  chips: { flexDirection: 'row', gap: SP.sm },
  row: { flexDirection: 'row', gap: SP.md },
  grow: { flex: 1 },
  grow2: { flex: 2 },
  suggestions: { marginTop: 6 },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SP.md,
    paddingHorizontal: SP.lg,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  suggestionLast: { borderBottomWidth: 0 },
  pressed: { backgroundColor: T.surfaceHigh },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SP.md,
  },
  totalValue: { fontSize: 24, lineHeight: 28 },

  done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SP.xxl, gap: SP.sm },
  doneDisc: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: T.greenLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SP.sm,
  },
  doneAmount: { marginTop: SP.xs, marginBottom: SP.sm },
  doneShare: { marginTop: SP.lg },
})
