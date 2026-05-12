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

interface ParsedRow {
  date: string
  item: string
  qty: number
  price: number
  total: number
  customer: string
  valid: boolean
  error?: string
}

function parseDate(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  // DD/MM/YYYY or D/M/YY
  const dmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (dmy) {
    const [, d, m, y] = dmy
    const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y)
    const date = new Date(year, parseInt(m) - 1, parseInt(d))
    if (!isNaN(date.getTime())) return date.toISOString()
  }
  // YYYY-MM-DD
  const isoMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}$/)
  if (isoMatch) {
    const date = new Date(trimmed + 'T12:00:00')
    if (!isNaN(date.getTime())) return date.toISOString()
  }
  // Natural language fallback
  const d = new Date(trimmed)
  if (!isNaN(d.getTime())) return d.toISOString()
  return null
}

function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim())
  if (lines.length === 0) return []

  // Detect header
  const firstLine = lines[0].toLowerCase()
  const hasHeader =
    firstLine.includes('date') ||
    firstLine.includes('item') ||
    firstLine.includes('sale') ||
    firstLine.includes('amount') ||
    firstLine.includes('price')

  const dataLines = hasHeader ? lines.slice(1) : lines

  // Detect column positions from header or use defaults
  let colDate = 0, colItem = 1, colQty = 2, colPrice = 3, colCustomer = 4

  if (hasHeader) {
    const headers = splitCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ''))
    colDate = headers.findIndex((h) => h.includes('date')) ?? 0
    colItem = headers.findIndex((h) => h.includes('item') || h.includes('product') || h.includes('description') || h.includes('sale'))
    colQty = headers.findIndex((h) => h.includes('qty') || h.includes('quantity'))
    colPrice = headers.findIndex((h) => h.includes('price') || h.includes('amount') || h.includes('total'))
    colCustomer = headers.findIndex((h) => h.includes('customer') || h.includes('client') || h.includes('name'))
    // fallback to defaults if not found
    if (colDate < 0) colDate = 0
    if (colItem < 0) colItem = 1
    if (colQty < 0) colQty = -1
    if (colPrice < 0) colPrice = headers.length > 2 ? 2 : 1
    if (colCustomer < 0) colCustomer = -1
  }

  return dataLines.map((line) => {
    const cols = splitCSVLine(line)
    if (cols.length < 2) return { date: '', item: line, qty: 1, price: 0, total: 0, customer: '', valid: false, error: 'Too few columns' }

    const rawDate = cols[colDate] || ''
    const rawItem = cols[colItem] || ''
    const rawQty = colQty >= 0 ? cols[colQty] : '1'
    const rawPrice = cols[colPrice] || ''
    const rawCustomer = colCustomer >= 0 ? (cols[colCustomer] || '') : ''

    const dateISO = parseDate(rawDate)
    const qty = parseFloat(rawQty.replace(/[^0-9.]/g, '')) || 1
    const price = parseFloat(rawPrice.replace(/[^0-9.]/g, ''))

    if (!dateISO) return { date: rawDate, item: rawItem, qty, price: price || 0, total: 0, customer: rawCustomer, valid: false, error: `Can't read date: "${rawDate}"` }
    if (!rawItem.trim()) return { date: rawDate, item: '', qty, price: price || 0, total: 0, customer: rawCustomer, valid: false, error: 'Missing item name' }
    if (isNaN(price) || price <= 0) return { date: rawDate, item: rawItem, qty, price: 0, total: 0, customer: rawCustomer, valid: false, error: `Can't read price: "${rawPrice}"` }

    return { date: dateISO, item: rawItem.trim(), qty, price, total: qty * price, customer: rawCustomer.trim(), valid: true }
  })
}

const EXAMPLE_CSV = `Date,Item,Qty,Price,Customer
15/03/2024,Blue Ankara,2,8500,Mrs Ade
15/03/2024,Plain White,3,4000,
16/03/2024,Lace Fabric,1,12000,Chidinma
17/03/2024,Accessories,5,1500,`

export default function CSVImportScreen() {
  const addSales = useStore((s) => s.addSales)

  const [csvText, setCSVText] = useState('')
  const [preview, setPreview] = useState<ParsedRow[] | null>(null)
  const [saved, setSaved] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const [savedTotal, setSavedTotal] = useState(0)

  function handleParse() {
    if (!csvText.trim()) return
    const rows = parseCSV(csvText)
    setPreview(rows)
  }

  function handleImport() {
    if (!preview) return
    const valid = preview.filter((r) => r.valid)
    if (valid.length === 0) return

    const sales: Sale[] = valid.map((r) => ({
      id: uid(),
      item: r.item,
      category: 'Other',
      qty: r.qty,
      price: r.price,
      total: r.total,
      customer: r.customer,
      isDebt: false,
      createdAt: r.date,
    }))

    const total = sales.reduce((s, sale) => s + sale.total, 0)
    addSales(sales)
    setSavedCount(sales.length)
    setSavedTotal(total)
    setSaved(true)
  }

  const validRows = preview?.filter((r) => r.valid) ?? []
  const invalidRows = preview?.filter((r) => !r.valid) ?? []
  const previewTotal = validRows.reduce((s, r) => s + r.total, 0)

  if (saved) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.success}>
          <View style={s.successCircle}>
            <Text style={s.successIcon}>✓</Text>
          </View>
          <Text style={s.successTitle}>Imported!</Text>
          <Text style={s.successSub}>{savedCount} sales added to your history</Text>
          <Text style={s.successAmount}>₦{savedTotal.toLocaleString()}</Text>
          <View style={s.successActions}>
            <TouchableOpacity
              style={s.ghostBtn}
              onPress={() => {
                setCSVText('')
                setPreview(null)
                setSaved(false)
              }}
            >
              <Text style={s.ghostBtnText}>Import More</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.primaryBtn} onPress={() => router.back()}>
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
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>Import from Spreadsheet</Text>
          <Text style={s.sub}>Copy your data from Excel or Google Sheets and paste it below.</Text>
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Instructions */}
          {!preview && (
            <View style={s.instructions}>
              <Text style={s.instrTitle}>How to export from Excel / Google Sheets:</Text>
              {[
                'In Google Sheets: File → Download → CSV',
                'In Excel: File → Save As → CSV',
                'Then open the file, select all (Ctrl+A), copy and paste below',
                'Or just type/paste the data directly',
              ].map((step, i) => (
                <View key={i} style={s.instrRow}>
                  <Text style={s.instrNum}>{i + 1}</Text>
                  <Text style={s.instrText}>{step}</Text>
                </View>
              ))}
              <View style={s.formatBox}>
                <Text style={s.formatLabel}>EXPECTED FORMAT</Text>
                <Text style={s.formatText}>{EXAMPLE_CSV}</Text>
              </View>
              <Text style={s.formatNote}>
                Column order is flexible — as long as you have Date, Item, and Price we'll figure out the rest.
              </Text>
            </View>
          )}

          {/* Paste area */}
          {!preview && (
            <View style={s.pasteSection}>
              <Text style={s.fieldLabel}>PASTE YOUR DATA HERE</Text>
              <TextInput
                style={s.pasteInput}
                multiline
                value={csvText}
                onChangeText={setCSVText}
                placeholder={`Date,Item,Qty,Price\n15/03/2024,Blue Ankara,2,8500\n16/03/2024,Lace Fabric,1,12000`}
                placeholderTextColor={T.faint}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[s.parseBtn, !csvText.trim() && s.parseBtnDisabled]}
                onPress={handleParse}
              >
                <Text style={[s.parseBtnText, !csvText.trim() && s.parseBtnTextDisabled]}>
                  Read My Data →
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Preview */}
          {preview && (
            <View style={s.previewSection}>
              <View style={s.previewHeader}>
                <Text style={s.previewTitle}>Preview</Text>
                <TouchableOpacity onPress={() => setPreview(null)}>
                  <Text style={s.editLink}>Edit data</Text>
                </TouchableOpacity>
              </View>

              {/* Summary */}
              <View style={s.previewSummary}>
                <View style={s.previewStat}>
                  <Text style={s.previewStatNum}>{validRows.length}</Text>
                  <Text style={s.previewStatLabel}>Ready to import</Text>
                </View>
                <View style={s.previewDivider} />
                <View style={s.previewStat}>
                  <Text style={[s.previewStatNum, s.previewStatTotal]}>₦{previewTotal.toLocaleString()}</Text>
                  <Text style={s.previewStatLabel}>Total value</Text>
                </View>
                {invalidRows.length > 0 && (
                  <>
                    <View style={s.previewDivider} />
                    <View style={s.previewStat}>
                      <Text style={[s.previewStatNum, s.previewStatError]}>{invalidRows.length}</Text>
                      <Text style={s.previewStatLabel}>Skipped rows</Text>
                    </View>
                  </>
                )}
              </View>

              {/* Valid rows */}
              {validRows.slice(0, 10).map((row, i) => (
                <View key={i} style={s.previewRow}>
                  <View style={s.previewRowLeft}>
                    <Text style={s.previewItem}>{row.item}</Text>
                    <Text style={s.previewMeta}>
                      {new Date(row.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {row.qty > 1 ? ` · ×${row.qty}` : ''}
                      {row.customer ? ` · ${row.customer}` : ''}
                    </Text>
                  </View>
                  <Text style={s.previewAmount}>₦{row.total.toLocaleString()}</Text>
                </View>
              ))}
              {validRows.length > 10 && (
                <Text style={s.moreRows}>+ {validRows.length - 10} more rows</Text>
              )}

              {/* Invalid rows */}
              {invalidRows.length > 0 && (
                <View style={s.errorSection}>
                  <Text style={s.errorTitle}>⚠ {invalidRows.length} row{invalidRows.length > 1 ? 's' : ''} skipped</Text>
                  {invalidRows.map((row, i) => (
                    <Text key={i} style={s.errorRow}>• {row.error}</Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {preview && validRows.length > 0 && (
          <View style={s.footer}>
            <TouchableOpacity style={s.importBtn} onPress={handleImport} activeOpacity={0.85}>
              <Text style={s.importBtnText}>
                Import {validRows.length} Sale{validRows.length > 1 ? 's' : ''} — ₦{previewTotal.toLocaleString()}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: {
    backgroundColor: T.dark,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 4,
  },
  back: { color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 17 },
  scroll: { padding: 20, gap: 16 },
  instructions: { gap: 10 },
  instrTitle: { fontSize: 13, fontWeight: '700', color: T.dark, marginBottom: 2 },
  instrRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  instrNum: {
    width: 20, height: 20, backgroundColor: T.accentLight, borderRadius: 10,
    textAlign: 'center', lineHeight: 20, fontSize: 11, fontWeight: '700', color: T.accent,
  },
  instrText: { flex: 1, fontSize: 13, color: T.muted, lineHeight: 18 },
  formatBox: {
    backgroundColor: T.dark,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    gap: 6,
  },
  formatLabel: { fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: FONT.mono, letterSpacing: 1.5 },
  formatText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: FONT.mono, lineHeight: 18 },
  formatNote: { fontSize: 11, color: T.muted, lineHeight: 16 },
  pasteSection: { gap: 8 },
  fieldLabel: { fontSize: 10, color: T.muted, fontFamily: FONT.mono, letterSpacing: 1.5 },
  pasteInput: {
    backgroundColor: T.surface,
    borderWidth: 2,
    borderColor: T.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 13,
    color: T.text,
    minHeight: 180,
    textAlignVertical: 'top',
    fontFamily: FONT.mono,
    lineHeight: 20,
  },
  parseBtn: {
    backgroundColor: T.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  parseBtnDisabled: { backgroundColor: T.border },
  parseBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  parseBtnTextDisabled: { color: T.muted },
  // Preview
  previewSection: { gap: 10 },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewTitle: { fontSize: 15, fontWeight: '700', color: T.dark },
  editLink: { fontSize: 13, color: T.accent },
  previewSummary: {
    flexDirection: 'row',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  previewStat: { flex: 1, alignItems: 'center', gap: 2 },
  previewStatNum: { fontSize: 22, fontWeight: '900', color: T.dark, letterSpacing: -0.5 },
  previewStatTotal: { color: T.green },
  previewStatError: { color: T.error },
  previewStatLabel: { fontSize: 10, color: T.muted, fontFamily: FONT.mono },
  previewDivider: { width: 1, height: 32, backgroundColor: T.border },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    padding: 12,
  },
  previewRowLeft: { flex: 1 },
  previewItem: { fontSize: 13, fontWeight: '600', color: T.dark },
  previewMeta: { fontSize: 10, color: T.faint, fontFamily: FONT.mono, marginTop: 2 },
  previewAmount: { fontSize: 13, fontWeight: '700', color: T.green },
  moreRows: { fontSize: 12, color: T.muted, textAlign: 'center', fontFamily: FONT.mono },
  errorSection: {
    backgroundColor: T.errorLight,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  errorTitle: { fontSize: 12, fontWeight: '700', color: T.error },
  errorRow: { fontSize: 11, color: T.error },
  footer: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: T.bg,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  importBtn: { backgroundColor: T.green, borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
  importBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  // Success
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  successCircle: {
    width: 80, height: 80, backgroundColor: T.greenLight,
    borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  successIcon: { fontSize: 34, color: T.green },
  successTitle: { fontSize: 28, fontWeight: '700', color: T.dark, fontFamily: FONT.serif },
  successSub: { fontSize: 14, color: T.muted },
  successAmount: { fontSize: 34, fontWeight: '900', color: T.green, letterSpacing: -1 },
  successActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 8 },
  ghostBtn: {
    flex: 1, backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.border,
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  ghostBtnText: { color: T.text, fontSize: 13, fontWeight: '600' },
  primaryBtn: { flex: 1, backgroundColor: T.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
})
