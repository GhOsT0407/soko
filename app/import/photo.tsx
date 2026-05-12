import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { T, FONT } from '@/constants/theme'
import { useStore } from '@/store'
import type { Sale } from '@/types'

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

interface SaleRow {
  key: string
  item: string
  qty: string
  price: string
}

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
  if (ymd) {
    const date = new Date(trimmed)
    if (!isNaN(date.getTime())) return date
  }
  const natural = new Date(trimmed)
  if (!isNaN(natural.getTime())) return natural
  return null
}

function formatDisplayDate(d: Date) {
  return d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PhotoImportScreen() {
  const addSales = useStore((s) => s.addSales)

  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [dateInput, setDateInput] = useState('')
  const [parsedDate, setParsedDate] = useState<Date | null>(null)
  const [rows, setRows] = useState<SaleRow[]>([{ key: uid(), item: '', qty: '1', price: '' }])
  const [saved, setSaved] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Camera needed', 'Please allow camera access to snap your notebook.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    })
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri)
    }
  }

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Gallery needed', 'Please allow photo library access.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    })
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri)
    }
  }

  function onDateChange(text: string) {
    setDateInput(text)
    setParsedDate(parseDate(text))
  }

  function setToday() {
    const today = new Date()
    const formatted = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`
    setDateInput(formatted)
    setParsedDate(today)
  }

  function addRow() {
    setRows((prev) => [...prev, { key: uid(), item: '', qty: '1', price: '' }])
  }

  function removeRow(key: string) {
    if (rows.length === 1) return
    setRows((prev) => prev.filter((r) => r.key !== key))
  }

  function updateRow(key: string, field: keyof Omit<SaleRow, 'key'>, value: string) {
    setRows((prev) => prev.map((r) => r.key === key ? { ...r, [field]: value } : r))
  }

  const validRows = rows.filter((r) => r.item.trim() && parseFloat(r.price) > 0)
  const totalAmount = validRows.reduce(
    (sum, r) => sum + (parseFloat(r.qty) || 1) * (parseFloat(r.price) || 0),
    0
  )
  const canSave = parsedDate !== null && validRows.length > 0

  function handleSave() {
    if (!canSave || !parsedDate) return
    const dateISO = parsedDate.toISOString()
    const sales: Sale[] = validRows.map((r) => {
      const qty = parseFloat(r.qty) || 1
      const price = parseFloat(r.price)
      return {
        id: uid(),
        item: r.item.trim(),
        category: 'Other',
        qty,
        price,
        total: qty * price,
        customer: '',
        isDebt: false,
        createdAt: dateISO,
      }
    })
    addSales(sales)
    setSavedCount(sales.length)
    setSaved(true)
  }

  // Success screen
  if (saved) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.success}>
          <View style={s.successCircle}>
            <Text style={s.successIcon}>✓</Text>
          </View>
          <Text style={s.successTitle}>Imported!</Text>
          <Text style={s.successSub}>
            {savedCount} sale{savedCount > 1 ? 's' : ''} added for{'\n'}
            {parsedDate ? formatDisplayDate(parsedDate) : ''}
          </Text>
          <Text style={s.successAmount}>₦{totalAmount.toLocaleString()} total</Text>
          <View style={s.successActions}>
            <TouchableOpacity
              style={s.ghostBtn}
              onPress={() => {
                setPhotoUri(null)
                setDateInput('')
                setParsedDate(null)
                setRows([{ key: uid(), item: '', qty: '1', price: '' }])
                setSaved(false)
              }}
            >
              <Text style={s.ghostBtnText}>Snap Another</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.primaryBtn} onPress={() => router.back()}>
              <Text style={s.primaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  // No photo yet — picker screen
  if (!photoUri) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>Snap Your Notebook</Text>
          <Text style={s.sub}>
            Take a photo of your sales book page — it stays on screen while you type in the numbers.
          </Text>
        </View>

        <View style={s.pickerBody}>
          {/* Preview placeholder */}
          <View style={s.photoPlaceholder}>
            <Text style={s.placeholderEmoji}>📷</Text>
            <Text style={s.placeholderTitle}>No photo yet</Text>
            <Text style={s.placeholderSub}>Snap or choose a photo of your notebook page</Text>
          </View>

          <View style={s.pickerBtns}>
            <TouchableOpacity style={[s.pickerBtn, s.pickerBtnPrimary]} onPress={takePhoto} activeOpacity={0.85}>
              <Text style={s.pickerBtnIcon}>📷</Text>
              <Text style={[s.pickerBtnText, s.pickerBtnTextPrimary]}>Take Photo</Text>
              <Text style={s.pickerBtnSub}>Open camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.pickerBtn} onPress={pickFromGallery} activeOpacity={0.85}>
              <Text style={s.pickerBtnIcon}>🖼️</Text>
              <Text style={s.pickerBtnText}>Choose Photo</Text>
              <Text style={s.pickerBtnSub}>From your gallery</Text>
            </TouchableOpacity>
          </View>

          <View style={s.tipBox}>
            <Text style={s.tipTitle}>Tips for a good snap</Text>
            <Text style={s.tipItem}>• Lay the notebook flat in good light</Text>
            <Text style={s.tipItem}>• Make sure the numbers are clear and readable</Text>
            <Text style={s.tipItem}>• One page at a time works best</Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  // Photo captured — show image + entry form
  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>Type from Your Photo</Text>
          <Text style={s.sub}>Your photo stays visible — type in what you see below.</Text>
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Photo preview — stays at top, collapsible in scroll */}
          <View style={s.photoFrame}>
            <Image source={{ uri: photoUri }} style={s.photoImage} resizeMode="contain" />
            <TouchableOpacity style={s.retakeBtn} onPress={() => setPhotoUri(null)}>
              <Text style={s.retakeBtnText}>Retake</Text>
            </TouchableOpacity>
          </View>

          {/* Date input */}
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
            {dateInput.length > 3 && !parsedDate && (
              <Text style={s.dateError}>Try: 15/03/2024 or 2024-03-15</Text>
            )}
          </View>

          {/* Sale rows */}
          <View style={s.section}>
            <Text style={s.fieldLabel}>SALES ON THIS DAY</Text>
            {rows.map((row, i) => (
              <View key={row.key} style={s.saleRow}>
                <View style={s.rowHeader}>
                  <Text style={s.rowNum}>#{i + 1}</Text>
                  {rows.length > 1 && (
                    <TouchableOpacity onPress={() => removeRow(row.key)}>
                      <Text style={s.removeBtn}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={[s.input, row.item.length > 0 && s.inputFilled]}
                  placeholder="What was sold?"
                  placeholderTextColor={T.faint}
                  value={row.item}
                  onChangeText={(v) => updateRow(row.key, 'item', v)}
                />
                <View style={s.twoCol}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.miniLabel}>QTY</Text>
                    <TextInput
                      style={[s.input, row.qty.length > 0 && s.inputFilled]}
                      keyboardType="numeric"
                      value={row.qty}
                      onChangeText={(v) => updateRow(row.key, 'qty', v)}
                      placeholder="1"
                      placeholderTextColor={T.faint}
                    />
                  </View>
                  <View style={{ flex: 2 }}>
                    <Text style={s.miniLabel}>AMOUNT (₦)</Text>
                    <TextInput
                      style={[s.input, row.price.length > 0 && s.inputFilled]}
                      keyboardType="numeric"
                      value={row.price}
                      onChangeText={(v) => updateRow(row.key, 'price', v)}
                      placeholder="0"
                      placeholderTextColor={T.faint}
                    />
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
              <Text style={s.totalLabel}>TOTAL FOR THIS DATE</Text>
              <Text style={s.totalAmount}>₦{totalAmount.toLocaleString()}</Text>
              <Text style={s.totalCount}>{validRows.length} sale{validRows.length > 1 ? 's' : ''}</Text>
            </View>
          )}
        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity
            style={[s.saveBtn, !canSave && s.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Text style={[s.saveBtnText, !canSave && s.saveBtnTextDisabled]}>
              {canSave
                ? `Save ${validRows.length} Sale${validRows.length > 1 ? 's' : ''} — ₦${totalAmount.toLocaleString()}`
                : 'Enter a date and at least one sale'}
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
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 22,
    gap: 4,
  },
  back: { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 17 },

  // Picker screen
  pickerBody: { flex: 1, padding: 20, gap: 16 },
  photoPlaceholder: {
    height: 180,
    backgroundColor: T.surface,
    borderWidth: 2,
    borderColor: T.border,
    borderStyle: 'dashed',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderEmoji: { fontSize: 40 },
  placeholderTitle: { fontSize: 15, fontWeight: '700', color: T.muted },
  placeholderSub: { fontSize: 12, color: T.faint, textAlign: 'center', paddingHorizontal: 20 },
  pickerBtns: { flexDirection: 'row', gap: 12 },
  pickerBtn: {
    flex: 1,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pickerBtnPrimary: { backgroundColor: T.dark, borderColor: T.dark },
  pickerBtnIcon: { fontSize: 28 },
  pickerBtnText: { fontSize: 14, fontWeight: '700', color: T.text },
  pickerBtnTextPrimary: { color: '#fff' },
  pickerBtnSub: { fontSize: 11, color: T.faint },
  tipBox: {
    backgroundColor: T.accentLight,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  tipTitle: { fontSize: 12, fontWeight: '700', color: T.accent, marginBottom: 2 },
  tipItem: { fontSize: 12, color: T.muted, lineHeight: 18 },

  // Photo + form screen
  scroll: { padding: 16, gap: 16 },
  photoFrame: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
    minHeight: 220,
  },
  photoImage: { width: '100%', height: 260 },
  retakeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retakeBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Form
  section: { gap: 8 },
  fieldLabel: { fontSize: 9, color: T.muted, fontFamily: FONT.mono, letterSpacing: 1.5 },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateInput: {
    flex: 1,
    backgroundColor: T.surface,
    borderWidth: 2,
    borderColor: T.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 17,
    color: T.text,
    fontFamily: FONT.mono,
  },
  dateInputValid: { borderColor: T.green },
  todayBtn: {
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBtnText: { fontSize: 12, fontWeight: '700', color: T.accent },
  dateParsed: { fontSize: 12, color: T.green, fontFamily: FONT.mono },
  dateError: { fontSize: 11, color: T.error },
  saleRow: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowNum: { fontSize: 11, fontWeight: '700', color: T.accent, fontFamily: FONT.mono },
  removeBtn: { fontSize: 12, color: T.error },
  input: {
    backgroundColor: T.bg,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: T.text,
  },
  inputFilled: { borderColor: T.accent },
  twoCol: { flexDirection: 'row', gap: 10 },
  miniLabel: { fontSize: 9, color: T.muted, fontFamily: FONT.mono, letterSpacing: 1, marginBottom: 4 },
  addRowBtn: {
    borderWidth: 1.5,
    borderColor: T.accent,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addRowBtnText: { fontSize: 14, color: T.accent, fontWeight: '700' },
  totalCard: {
    backgroundColor: T.accentLight,
    borderWidth: 1,
    borderColor: T.accent + '44',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 2,
  },
  totalLabel: { fontSize: 10, color: T.accent, fontFamily: FONT.mono, letterSpacing: 1.5 },
  totalAmount: { fontSize: 32, fontWeight: '900', color: T.accent, letterSpacing: -1 },
  totalCount: { fontSize: 12, color: T.muted },
  footer: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: T.bg,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  saveBtn: { backgroundColor: T.accent, borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: T.border },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  saveBtnTextDisabled: { color: T.muted },

  // Success
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  successCircle: {
    width: 80, height: 80, backgroundColor: T.greenLight,
    borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  successIcon: { fontSize: 34, color: T.green },
  successTitle: { fontSize: 28, fontWeight: '700', color: T.dark, fontFamily: FONT.serif },
  successSub: { fontSize: 14, color: T.muted, textAlign: 'center', lineHeight: 20 },
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
