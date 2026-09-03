import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Share,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { T, FONT } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'

export default function NewSaleScreen() {
  const activeBusiness = useStore((s) => s.activeBusiness)
  const session = useStore((s) => s.session)

  const [item, setItem] = useState('')
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState('')
  const [customer, setCustomer] = useState('')
  const [isDebt, setIsDebt] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [suggestions, setSuggestions] = useState<{ item: string; price: number }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [topItems, setTopItems] = useState<{ item: string; price: number }[]>([])

  const [saleMode, setSaleMode] = useState<'single' | 'day'>('single')
  const [dayDate, setDayDate] = useState<'Today' | 'Yesterday' | 'Earlier'>('Today')
  const [dayDaysAgo, setDayDaysAgo] = useState('2')
  const [dayCash, setDayCash] = useState('')
  const [dayDebt, setDayDebt] = useState('')
  const [dayCount, setDayCount] = useState('')
  const [dayNote, setDayNote] = useState('')
  const [savedSnap, setSavedSnap] = useState<
    { mode: 'single'; item: string; total: number; isDebt: boolean; customer: string }
    | { mode: 'day'; date: string; total: number; count: string }
    | null
  >(null)

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

  function pickSuggestion(sg: { item: string; price: number }) {
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
      setSaved(true)
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
      setSaved(true)
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save day total.')
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.success}>
          <View style={s.successCircle}>
            <Ionicons name="checkmark" size={36} color={T.green} />
          </View>
          <Text style={s.successTitle}>{savedSnap?.mode === 'day' ? 'Day Recorded!' : 'Sale Recorded!'}</Text>
          <Text style={s.successItem}>
            {savedSnap?.mode === 'day'
              ? (savedSnap.count ? `${savedSnap.count} sales · ${savedSnap.date}` : savedSnap.date)
              : savedSnap?.item}
          </Text>
          <Text style={s.successAmount}>₦{(savedSnap?.total ?? 0).toLocaleString()}</Text>
          {savedSnap?.mode === 'single' && savedSnap.isDebt && (
            <View style={s.debtNote}>
              <Text style={s.debtNoteText}>Debt added for {savedSnap.customer || 'customer'}</Text>
            </View>
          )}
          <TouchableOpacity style={s.receiptBtn} onPress={handleShareReceipt}>
            <Ionicons name="share-social-outline" size={15} color={T.accent} />
            <Text style={s.receiptBtnText}>Share Receipt on WhatsApp</Text>
          </TouchableOpacity>
          <View style={s.successActions}>
            <TouchableOpacity style={s.ghostBtn} onPress={() => router.back()}>
              <Text style={s.ghostBtnText}>Done</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => { resetForm(); setSaved(false) }}
            >
              <Text style={s.primaryBtnText}>+ Another</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={22} color={T.muted} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Record Sale</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={s.segmentWrap}>
          <TouchableOpacity
            style={[s.segment, saleMode === 'single' && s.segmentActive]}
            onPress={() => setSaleMode('single')}
          >
            <Ionicons name="receipt-outline" size={15} color={saleMode === 'single' ? T.accent : T.muted} />
            <Text style={[s.segmentText, saleMode === 'single' && s.segmentTextActive]}>Per sale</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.segment, saleMode === 'day' && s.segmentActive]}
            onPress={() => setSaleMode('day')}
          >
            <Ionicons name="calendar-outline" size={15} color={saleMode === 'day' ? T.accent : T.muted} />
            <Text style={[s.segmentText, saleMode === 'day' && s.segmentTextActive]}>Per day</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.modeHint}>
          {saleMode === 'day'
            ? 'Already sold today? Enter your total takings for the day in one entry.'
            : 'Log each item as you sell it — with optional customer and debt.'}
        </Text>

        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        {saleMode === 'day' ? (
          <>
            <View style={s.field}>
              <Text style={s.label}>WHICH DAY</Text>
              <View style={s.dayChips}>
                {(['Today', 'Yesterday', 'Earlier'] as const).map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[s.dayChip, dayDate === d && s.dayChipActive]}
                    onPress={() => setDayDate(d)}
                  >
                    <Text style={[s.dayChipText, dayDate === d && s.dayChipTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {dayDate === 'Earlier' && (
                <TextInput
                  style={[s.input, { marginTop: 8 }]}
                  keyboardType="numeric"
                  value={dayDaysAgo}
                  onChangeText={setDayDaysAgo}
                  placeholder="Days ago, e.g. 3"
                  placeholderTextColor={T.faint}
                />
              )}
            </View>

            <View style={s.row}>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={[s.label, { color: T.green }]}>CASH SALES (₦)</Text>
                <TextInput
                  style={[s.input, parseFloat(dayCash) > 0 && { borderColor: T.green }]}
                  keyboardType="numeric"
                  value={dayCash}
                  onChangeText={setDayCash}
                  placeholder="0"
                  placeholderTextColor={T.faint}
                />
              </View>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={[s.label, { color: T.warning }]}>ON CREDIT (₦)</Text>
                <TextInput
                  style={[s.input, parseFloat(dayDebt) > 0 && { borderColor: T.warning }]}
                  keyboardType="numeric"
                  value={dayDebt}
                  onChangeText={setDayDebt}
                  placeholder="0"
                  placeholderTextColor={T.faint}
                />
              </View>
            </View>

            {dayTotal > 0 && (
              <View style={s.totalCard}>
                <Text style={s.totalLabel}>DAY TOTAL</Text>
                <Text style={s.totalAmount}>₦{dayTotal.toLocaleString()}</Text>
              </View>
            )}

            <View style={s.field}>
              <Text style={s.label}>NUMBER OF SALES (OPTIONAL)</Text>
              <TextInput
                style={s.input}
                keyboardType="numeric"
                value={dayCount}
                onChangeText={setDayCount}
                placeholder="e.g. 12"
                placeholderTextColor={T.faint}
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>NOTE (OPTIONAL)</Text>
              <TextInput
                style={s.input}
                value={dayNote}
                onChangeText={setDayNote}
                placeholder="e.g. Market day, busy morning"
                placeholderTextColor={T.faint}
              />
            </View>
          </>
        ) : (
          <>
          {topItems.length > 0 && !item && (
            <View style={s.quickSection}>
              <Text style={s.label}>QUICK ADD</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.quickChips}>
                  {topItems.map((qi) => (
                    <TouchableOpacity key={qi.item} style={s.quickChip} onPress={() => pickSuggestion(qi)}>
                      <Text style={s.quickChipText} numberOfLines={1}>{qi.item}</Text>
                      <Text style={s.quickChipPrice}>₦{qi.price.toLocaleString()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <View style={s.field}>
            <Text style={s.label}>ITEM / SERVICE</Text>
            <TextInput
              style={[s.input, item.length > 0 && s.inputActive]}
              placeholder="e.g. Rice 50kg, Haircut, Fabric"
              placeholderTextColor={T.faint}
              value={item}
              onChangeText={(v) => { setItem(v); setShowSuggestions(true) }}
              returnKeyType="next"
            />
            {showSuggestions && suggestions.length > 0 && (
              <View style={s.suggestions}>
                {suggestions.map((sg) => (
                  <TouchableOpacity
                    key={sg.item}
                    style={s.suggestion}
                    onPress={() => pickSuggestion(sg)}
                  >
                    <Text style={s.suggestionItem}>{sg.item}</Text>
                    <Text style={s.suggestionPrice}>₦{sg.price.toLocaleString()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={s.row}>
            <View style={[s.field, { flex: 1 }]}>
              <Text style={s.label}>QTY</Text>
              <TextInput
                style={[s.input, qty.length > 0 && s.inputActive]}
                keyboardType="numeric"
                value={qty}
                onChangeText={setQty}
                placeholder="1"
                placeholderTextColor={T.faint}
              />
            </View>
            <View style={[s.field, { flex: 2 }]}>
              <Text style={s.label}>UNIT PRICE (₦)</Text>
              <TextInput
                style={[s.input, price.length > 0 && s.inputActive]}
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
                placeholder="0"
                placeholderTextColor={T.faint}
              />
            </View>
          </View>

          {total > 0 && (
            <View style={s.totalCard}>
              <Text style={s.totalLabel}>TOTAL</Text>
              <Text style={s.totalAmount}>₦{total.toLocaleString()}</Text>
            </View>
          )}

          <View style={s.field}>
            <Text style={s.label}>CUSTOMER (OPTIONAL)</Text>
            <TextInput
              style={[s.input, customer.length > 0 && s.inputActive]}
              placeholder="Name or phone number"
              placeholderTextColor={T.faint}
              value={customer}
              onChangeText={setCustomer}
            />
          </View>

          <TouchableOpacity
            style={[s.debtToggle, isDebt && s.debtToggleActive]}
            onPress={() => setIsDebt(!isDebt)}
            activeOpacity={0.8}
          >
            <View style={s.debtLeft}>
              <View style={[s.debtIcon, isDebt && s.debtIconActive]}>
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color={isDebt ? T.warning : T.muted}
                />
              </View>
              <View>
                <Text style={[s.debtLabel, isDebt && { color: T.warning }]}>Record as debt</Text>
                <Text style={s.debtSub}>Customer will pay later</Text>
              </View>
            </View>
            <View style={[s.toggle, isDebt && s.toggleOn]}>
              <View style={[s.toggleThumb, isDebt && s.toggleThumbOn]} />
            </View>
          </TouchableOpacity>
          </>
        )}
        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity
            style={[s.saveBtn, (!activeCanSave || saving) && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!activeCanSave || saving}
            activeOpacity={0.85}
          >
            <Text style={s.saveBtnText}>
              {saving
                ? 'Saving...'
                : activeCanSave
                ? `Save  ₦${activeTotal.toLocaleString()}`
                : saleMode === 'day' ? 'Enter your takings' : 'Enter item & price'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: T.text },
  segmentWrap: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: T.surfaceHigh,
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 14,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    borderRadius: 11,
  },
  segmentActive: {
    backgroundColor: '#fff',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: { fontSize: 14, fontWeight: '700', color: T.muted },
  segmentTextActive: { color: T.accent },
  modeHint: { fontSize: 12, color: T.faint, lineHeight: 17, paddingHorizontal: 24, paddingTop: 9 },
  dayChips: { flexDirection: 'row', gap: 8 },
  dayChip: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: T.surface,
    alignItems: 'center',
  },
  dayChipActive: { backgroundColor: T.accent, borderColor: T.accent },
  dayChipText: { fontSize: 13, fontWeight: '700', color: T.muted },
  dayChipTextActive: { color: '#fff' },
  scroll: { padding: 20, gap: 18 },
  field: { gap: 7 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: T.muted,
    letterSpacing: 1.5,
    fontFamily: FONT.mono,
  },
  input: {
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: T.text,
  },
  inputActive: { borderColor: T.accent },
  suggestions: {
    marginTop: 4,
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  suggestionItem: { fontSize: 14, color: T.text, fontWeight: '500' },
  suggestionPrice: { fontSize: 13, color: T.accent, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12 },
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: T.accentLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: T.accent + '33',
  },
  totalLabel: {
    fontSize: 11,
    color: T.accent,
    fontFamily: FONT.mono,
    letterSpacing: 1,
    fontWeight: '700',
  },
  totalAmount: { fontSize: 28, fontWeight: '900', color: T.accent, letterSpacing: -0.5 },
  debtToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 14,
    padding: 14,
  },
  debtToggleActive: { backgroundColor: T.warningLight, borderColor: T.warning + '88' },
  debtLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  debtIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: T.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debtIconActive: { backgroundColor: T.warningLight },
  debtLabel: { fontSize: 14, fontWeight: '700', color: T.text },
  debtSub: { fontSize: 11, color: T.faint, marginTop: 1 },
  toggle: {
    width: 44,
    height: 24,
    backgroundColor: T.border,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: T.warning },
  toggleThumb: { width: 20, height: 20, backgroundColor: '#fff', borderRadius: 10 },
  toggleThumbOn: { transform: [{ translateX: 20 }] },
  footer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  saveBtn: {
    backgroundColor: T.accent,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: T.border },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  success: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 14,
  },
  successCircle: {
    width: 80,
    height: 80,
    backgroundColor: T.greenLight,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { fontSize: 26, fontWeight: '800', color: T.text, letterSpacing: -0.5 },
  successItem: { fontSize: 14, color: T.muted },
  successAmount: { fontSize: 40, fontWeight: '900', color: T.green, letterSpacing: -1 },
  debtNote: {
    backgroundColor: T.warningLight,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  debtNoteText: { fontSize: 13, color: T.warning, fontWeight: '600' },
  successActions: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 8 },
  ghostBtn: {
    flex: 1,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ghostBtnText: { color: T.text, fontSize: 15, fontWeight: '600' },
  primaryBtn: {
    flex: 2,
    backgroundColor: T.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  quickSection: { gap: 8 },
  quickChips: { flexDirection: 'row', gap: 8 },
  quickChip: {
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
  },
  quickChipText: { fontSize: 13, fontWeight: '600', color: T.text, maxWidth: 110 },
  quickChipPrice: { fontSize: 11, color: T.accent, fontWeight: '700' },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: T.accentLight,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: T.accent + '33',
    width: '100%',
  },
  receiptBtnText: { color: T.accent, fontWeight: '700', fontSize: 14 },
})
