import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { T, FONT } from '@/constants/theme'
import { useStore } from '@/store'
import type { Sale } from '@/types'

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

interface SaleRow { key: string; item: string; qty: string; price: string }

function parseDate(raw: string): Date | null {
  const trimmed = raw.trim()
  const dmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (dmy) {
    const [, d, m, y] = dmy
    const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y)
    const date = new Date(year, parseInt(m) - 1, parseInt(d))
    if (!isNaN(date.getTime())) return date
  }
  const ymd = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (ymd) { const d = new Date(trimmed); if (!isNaN(d.getTime())) return d }
  const natural = new Date(trimmed)
  if (!isNaN(natural.getTime())) return natural
  return null
}

function formatDisplayDate(d: Date) {
  return d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ManualImportScreen() {
  const addSales = useStore((s) => s.addSales)
  const [dateInput, setDateInput] = useState('')
  const [parsedDate, setParsedDate] = useState<Date | null>(null)
  const [rows, setRows] = useState<SaleRow[]>([{ key: uid(), item: '', qty: '1', price: '' }])
  const [saved, setSaved] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

  function onDateChange(text: string) { setDateInput(text); setParsedDate(parseDate(text)) }
  function setToday() {
    const t = new Date()
    const f = `${t.getDate()}/${t.getMonth() + 1}/${t.getFullYear()}`
    setDateInput(f); setParsedDate(t)
  }
  function addRow() { setRows((p) => [...p, { key: uid(), item: '', qty: '1', price: '' }]) }
  function removeRow(key: string) { if (rows.length > 1) setRows((p) => p.filter((r) => r.key !== key)) }
  function updateRow(key: string, field: keyof Omit<SaleRow, 'key'>, value: string) {
    setRows((p) => p.map((r) => r.key === key ? { ...r, [field]: value } : r))
  }

  const validRows = rows.filter((r) => r.item.trim() && parseFloat(r.price) > 0)
  const totalAmount = validRows.reduce((sum, r) => sum + (parseFloat(r.qty) || 1) * (parseFloat(r.price) || 0), 0)
  const canSave = parsedDate !== null && validRows.length > 0

  function handleSave() {
    if (!canSave || !parsedDate) return
    const sales: Sale[] = validRows.map((r) => {
      const qty = parseFloat(r.qty) || 1; const price = parseFloat(r.price)
      return { id: uid(), item: r.item.trim(), category: 'Other', qty, price, total: qty * price, customer: '', isDebt: false, createdAt: parsedDate.toISOString() }
    })
    addSales(sales); setSavedCount(sales.length); setSaved(true)
  }

  if (saved) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.success}>
          <View style={s.successOrb} /><View style={s.successOrb2} />
          <View style={s.successCircle}>
            <View style={s.successCircleGlow} />
            <Text style={s.successIcon}>✓</Text>
          </View>
          <Text style={s.successTitle}>Imported!</Text>
          <Text style={s.successSub}>{savedCount} sale{savedCount > 1 ? 's' : ''} added for{'\n'}{parsedDate ? formatDisplayDate(parsedDate) : ''}</Text>
          <Text style={s.successAmount}>₦{totalAmount.toLocaleString()}</Text>
          <View style={s.successActions}>
            <TouchableOpacity style={s.ghostBtn} onPress={() => { setDateInput(''); setParsedDate(null); setRows([{ key: uid(), item: '', qty: '1', price: '' }]); setSaved(false) }}>
              <Text style={s.ghostBtnText}>Add Another Date</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.primaryBtn} onPress={() => router.back()}>
              <View style={s.primaryBtnTopEdge} />
              <Text style={s.primaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.header}>
          <View style={s.headerOrb} />
          <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Back</Text></TouchableOpacity>
          <Text style={s.title}>Type from Notebook</Text>
          <Text style={s.sub}>Pick a date, then list the sales from that day.</Text>
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Date */}
          <View style={s.section}>
            <Text style={s.fieldLabel}>DATE OF SALES</Text>
            <View style={s.dateRow}>
              <TextInput
                style={[s.dateInput, parsedDate !== null && s.dateInputValid]}
                placeholder="e.g. 15/03/2024"
                placeholderTextColor={T.faint}
                value={dateInput}
                onChangeText={onDateChange}
              />
              <TouchableOpacity style={s.todayBtn} onPress={setToday}>
                <Text style={s.todayBtnText}>Today</Text>
              </TouchableOpacity>
            </View>
            {parsedDate && <Text style={s.dateParsed}>✓ {formatDisplayDate(parsedDate)}</Text>}
            {dateInput.length > 3 && !parsedDate && <Text style={s.dateError}>Try: 15/03/2024 or 2024-03-15</Text>}
          </View>

          {/* Rows */}
          <View style={s.section}>
            <Text style={s.fieldLabel}>SALES ON THIS DAY</Text>
            {rows.map((row, i) => (
              <View key={row.key} style={s.saleRow}>
                <View style={s.saleRowTopEdge} />
                <View style={s.rowHeader}>
                  <Text style={s.rowNum}>#{i + 1}</Text>
                  {rows.length > 1 && <TouchableOpacity onPress={() => removeRow(row.key)}><Text style={s.removeBtn}>Remove</Text></TouchableOpacity>}
                </View>
                <TextInput style={[s.input, row.item.length > 0 && s.inputFilled]} placeholder="What was sold?" placeholderTextColor={T.faint} value={row.item} onChangeText={(v) => updateRow(row.key, 'item', v)} />
                <View style={s.twoCol}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.miniLabel}>QTY</Text>
                    <TextInput style={[s.input, row.qty.length > 0 && s.inputFilled]} keyboardType="numeric" value={row.qty} onChangeText={(v) => updateRow(row.key, 'qty', v)} placeholder="1" placeholderTextColor={T.faint} />
                  </View>
                  <View style={{ flex: 2 }}>
                    <Text style={s.miniLabel}>AMOUNT (₦)</Text>
                    <TextInput style={[s.input, row.price.length > 0 && s.inputFilled]} keyboardType="numeric" value={row.price} onChangeText={(v) => updateRow(row.key, 'price', v)} placeholder="0" placeholderTextColor={T.faint} />
                  </View>
                </View>
              </View>
            ))}
            <TouchableOpacity style={s.addRowBtn} onPress={addRow}>
              <Text style={s.addRowBtnText}>+ Add Another Sale</Text>
            </TouchableOpacity>
          </View>

          {totalAmount > 0 && (
            <View style={s.totalCard}>
              <View style={s.totalCardTopEdge} />
              <View style={s.totalCardOrb} />
              <Text style={s.totalLabel}>TOTAL FOR THIS DATE</Text>
              <Text style={s.totalAmount}>₦{totalAmount.toLocaleString()}</Text>
              <Text style={s.totalCount}>{validRows.length} sale{validRows.length > 1 ? 's' : ''}</Text>
            </View>
          )}
        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity style={[s.saveBtn, !canSave && s.saveBtnDisabled]} onPress={handleSave} activeOpacity={0.85}>
            {canSave && <View style={s.saveBtnTopEdge} />}
            <Text style={[s.saveBtnText, !canSave && s.saveBtnTextDisabled]}>
              {canSave ? `Save ${validRows.length} Sale${validRows.length > 1 ? 's' : ''}  ·  ₦${totalAmount.toLocaleString()}` : 'Enter a date and at least one sale'}
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
    backgroundColor: T.dark,
    paddingHorizontal: 22, paddingTop: 18, paddingBottom: 22,
    overflow: 'hidden', position: 'relative', gap: 5,
  },
  headerOrb: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: T.accentMid, opacity: 0.1, top: -60, right: -40,
  },
  back: { color: 'rgba(255,255,255,0.35)', fontSize: 14, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 17 },
  scroll: { padding: 20, gap: 20 },
  section: { gap: 10 },
  fieldLabel: { fontSize: 9, color: T.muted, fontFamily: FONT.mono, letterSpacing: 1.8 },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateInput: {
    flex: 1, backgroundColor: T.card, borderWidth: 1, borderColor: T.border,
    borderTopColor: T.glassBorder, borderRadius: 14, padding: 14, fontSize: 17,
    color: T.text, fontFamily: FONT.mono,
  },
  dateInputValid: {
    borderColor: 'rgba(52,211,153,0.5)', borderTopColor: T.green,
    shadowColor: T.green, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
  },
  todayBtn: {
    backgroundColor: T.accentLight, borderWidth: 1, borderColor: T.accentMid,
    borderRadius: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center',
  },
  todayBtnText: { fontSize: 12, fontWeight: '700', color: T.accent },
  dateParsed: { fontSize: 12, color: T.green, fontFamily: FONT.mono },
  dateError: { fontSize: 11, color: T.error },
  saleRow: {
    backgroundColor: T.card, borderWidth: 1, borderColor: T.border,
    borderRadius: 16, padding: 14, gap: 10, overflow: 'hidden', position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
  },
  saleRowTopEdge: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: T.glassTopBorder },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowNum: { fontSize: 10, fontWeight: '700', color: T.accent, fontFamily: FONT.mono },
  removeBtn: { fontSize: 12, color: T.error },
  input: {
    backgroundColor: T.bg, borderWidth: 1, borderColor: T.border,
    borderTopColor: T.glassBorder, borderRadius: 10, padding: 12, fontSize: 15, color: T.text,
  },
  inputFilled: {
    borderColor: T.accentMid, borderTopColor: T.accent,
    shadowColor: T.accentMid, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 2,
  },
  twoCol: { flexDirection: 'row', gap: 10 },
  miniLabel: { fontSize: 9, color: T.muted, fontFamily: FONT.mono, letterSpacing: 1, marginBottom: 4 },
  addRowBtn: {
    borderWidth: 1.5, borderColor: T.accent, borderStyle: 'dashed',
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    backgroundColor: T.accentLight,
  },
  addRowBtnText: { fontSize: 14, color: T.accent, fontWeight: '700' },
  totalCard: {
    backgroundColor: T.accentLight, borderWidth: 1, borderColor: T.accentMid,
    borderRadius: 20, padding: 20, alignItems: 'center', gap: 4,
    overflow: 'hidden', position: 'relative',
    transform: [{ perspective: 700 }, { rotateX: '-3deg' }],
    shadowColor: T.accentMid, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  totalCardTopEdge: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: T.accent },
  totalCardOrb: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: T.accentMid, opacity: 0.12, top: -20, right: -10 },
  totalLabel: { fontSize: 9, color: 'rgba(167,139,250,0.6)', fontFamily: FONT.mono, letterSpacing: 1.5 },
  totalAmount: {
    fontSize: 40, fontWeight: '900', color: T.accent, letterSpacing: -1.5,
    textShadowColor: T.accentGlow, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16,
  },
  totalCount: { fontSize: 12, color: T.muted },
  footer: { padding: 16, paddingBottom: 28, backgroundColor: T.bg, borderTopWidth: 1, borderTopColor: T.border },
  saveBtn: {
    backgroundColor: T.accentDark, borderRadius: 16, paddingVertical: 18, alignItems: 'center',
    overflow: 'hidden', position: 'relative',
    shadowColor: T.accentMid, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 18, elevation: 14,
  },
  saveBtnDisabled: { backgroundColor: T.card, shadowOpacity: 0, elevation: 0 },
  saveBtnTopEdge: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: T.accent },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  saveBtnTextDisabled: { color: T.faint },
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, position: 'relative', overflow: 'hidden' },
  successOrb: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: T.green, opacity: 0.06, top: -80 },
  successOrb2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: T.accentMid, opacity: 0.05, bottom: -60, right: -50 },
  successCircle: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: T.greenLight, borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    position: 'relative', shadowColor: T.green, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
  },
  successCircleGlow: { position: 'absolute', inset: -8, borderRadius: 50, backgroundColor: T.green, opacity: 0.1 },
  successIcon: { fontSize: 36, color: T.green },
  successTitle: { fontSize: 28, fontWeight: '800', color: T.text, letterSpacing: -0.5 },
  successSub: { fontSize: 14, color: T.muted, textAlign: 'center', lineHeight: 21 },
  successAmount: {
    fontSize: 44, fontWeight: '900', color: T.green, letterSpacing: -2,
    textShadowColor: T.greenGlow, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16,
  },
  successActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 8 },
  ghostBtn: {
    flex: 1, backgroundColor: T.card, borderWidth: 1, borderColor: T.border, borderTopColor: T.glassBorder,
    borderRadius: 14, paddingVertical: 15, alignItems: 'center',
  },
  ghostBtnText: { color: T.text, fontSize: 13, fontWeight: '700' },
  primaryBtn: {
    flex: 1, backgroundColor: T.accentDark, borderRadius: 14, paddingVertical: 15, alignItems: 'center',
    overflow: 'hidden', position: 'relative',
    shadowColor: T.accentMid, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.45, shadowRadius: 12, elevation: 8,
  },
  primaryBtnTopEdge: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: T.accent },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
})
