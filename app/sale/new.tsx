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
  Image,
  ActivityIndicator,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { T, FONT } from '@/constants/theme'
import { SALE_CATEGORIES, TAILORED } from '@/constants/data'
import { useStore } from '@/store'
import type { BusinessTypeId } from '@/constants/data'
import type { Sale } from '@/types'

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export default function NewSaleScreen() {
  const profile = useStore((s) => s.profile)
  const addSale = useStore((s) => s.addSale)
  const addDebt = useStore((s) => s.addDebt)

  const btypeId = (profile.businessType || 'trader') as BusinessTypeId
  const categories = SALE_CATEGORIES[btypeId] || SALE_CATEGORIES.trader
  const tailored = TAILORED[btypeId] || TAILORED.trader

  const [category, setCategory] = useState(categories[0])
  const [item, setItem] = useState('')
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState('')
  const [customer, setCustomer] = useState('')
  const [isDebt, setIsDebt] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
  const [pickingPhoto, setPickingPhoto] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleAddPhotos() {
    setPickingPhoto(true)
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        // No selectionLimit — let the OS decide (iOS: up to 100, Android: unlimited)
      })
      if (!result.canceled) {
        const uris = result.assets.map((a) => a.uri)
        setPhotos((prev) => {
          const existing = new Set(prev)
          return [...prev, ...uris.filter((u) => !existing.has(u))]
        })
      }
    } finally {
      setPickingPhoto(false)
    }
  }

  function removePhoto(uri: string) {
    setPhotos((prev) => prev.filter((p) => p !== uri))
  }

  const total = (parseFloat(qty) || 0) * (parseFloat(price) || 0)
  const canSave = item.trim().length > 0 && parseFloat(price) > 0

  function handleSave() {
    if (!canSave) return
    const id = uid()
    const now = new Date().toISOString()

    const sale: Sale = {
      id,
      item: item.trim(),
      category,
      qty: parseFloat(qty) || 1,
      price: parseFloat(price),
      total,
      customer: customer.trim(),
      isDebt,
      createdAt: now,
      photos: photos.length > 0 ? photos : undefined,
    }

    addSale(sale)

    if (isDebt) {
      addDebt({
        id: uid(),
        customer: customer.trim() || 'Unknown customer',
        phone: '',
        amount: total,
        description: item.trim(),
        paid: false,
        createdAt: now,
      })
    }

    setSaved(true)
  }

  if (saved) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.success}>
          <View style={s.successCircle}>
            <Text style={s.successIcon}>✓</Text>
          </View>
          <Text style={s.successTitle}>Sale Recorded!</Text>
          <Text style={s.successItem}>{item}</Text>
          <Text style={s.successAmount}>₦{total.toLocaleString()}</Text>
          {isDebt && (
            <View style={s.debtNote}>
              <Text style={s.debtNoteText}>
                Recorded as debt for {customer || 'customer'}
              </Text>
            </View>
          )}
          <View style={s.successActions}>
            <TouchableOpacity style={s.ghostBtn} onPress={() => router.back()}>
              <Text style={s.ghostBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => {
                setItem('')
                setQty('1')
                setPrice('')
                setCustomer('')
                setIsDebt(false)
                setCategory(categories[0])
                setPhotos([])
                setSaved(false)
              }}
            >
              <Text style={s.primaryBtnText}>+ New Sale</Text>
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
            <Text style={s.headerBack}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>{tailored.saleLabel}</Text>
          <Text style={s.headerSub}>{profile.businessName || 'Your Business'}</Text>
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Category pills */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[s.pill, category === cat && s.pillActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[s.pillText, category === cat && s.pillTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Item */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>ITEM / SERVICE</Text>
            <TextInput
              style={[s.input, item.length > 0 && s.inputFilled]}
              placeholder="e.g. Blue ankara, 2 yards"
              placeholderTextColor={T.faint}
              value={item}
              onChangeText={setItem}
            />
          </View>

          {/* Qty + Price */}
          <View style={s.row}>
            <View style={[s.field, { flex: 1 }]}>
              <Text style={s.fieldLabel}>QTY</Text>
              <TextInput
                style={[s.input, qty.length > 0 && s.inputFilled]}
                keyboardType="numeric"
                value={qty}
                onChangeText={setQty}
                placeholder="1"
                placeholderTextColor={T.faint}
              />
            </View>
            <View style={[s.field, { flex: 2 }]}>
              <Text style={s.fieldLabel}>UNIT PRICE (₦)</Text>
              <TextInput
                style={[s.input, price.length > 0 && s.inputFilled]}
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor={T.faint}
              />
            </View>
          </View>

          {/* Live total */}
          {total > 0 && (
            <View style={s.totalCard}>
              <Text style={s.totalLabel}>TOTAL</Text>
              <Text style={s.totalAmount}>₦{total.toLocaleString()}</Text>
            </View>
          )}

          {/* Customer */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>CUSTOMER (OPTIONAL)</Text>
            <TextInput
              style={[s.input, customer.length > 0 && s.inputFilled]}
              placeholder="Customer name or phone"
              placeholderTextColor={T.faint}
              value={customer}
              onChangeText={setCustomer}
            />
          </View>

          {/* Photos */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>PHOTOS (OPTIONAL)</Text>
            <View style={s.photoRow}>
              {photos.map((uri) => (
                <View key={uri} style={s.photoThumb}>
                  <Image source={{ uri }} style={s.photoImg} resizeMode="cover" />
                  <TouchableOpacity
                    style={s.photoRemove}
                    onPress={() => removePhoto(uri)}
                    hitSlop={6}
                  >
                    <Ionicons name="close" size={11} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={s.photoAdd}
                onPress={handleAddPhotos}
                disabled={pickingPhoto}
                activeOpacity={0.75}
              >
                {pickingPhoto ? (
                  <ActivityIndicator size="small" color={T.accent} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={22} color={T.accent} />
                    <Text style={s.photoAddLabel}>
                      {photos.length === 0 ? 'Add' : 'More'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Debt toggle */}
          <TouchableOpacity
            style={[s.debtToggle, isDebt && s.debtToggleActive]}
            onPress={() => setIsDebt(!isDebt)}
            activeOpacity={0.8}
          >
            <View style={s.debtToggleLeft}>
              <Text style={s.debtToggleIcon}>📋</Text>
              <View>
                <Text style={s.debtToggleLabel}>Record as debt</Text>
                <Text style={s.debtToggleSub}>Customer will pay later</Text>
              </View>
            </View>
            <View style={[s.toggle, isDebt && s.toggleOn]}>
              <View style={[s.toggleThumb, isDebt && s.toggleThumbOn]} />
            </View>
          </TouchableOpacity>
        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity
            style={[s.saveBtn, !canSave && s.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Text style={[s.saveBtnText, !canSave && s.saveBtnTextDisabled]}>
              {canSave ? `Save Sale — ₦${total.toLocaleString()}` : 'Fill in item & price'}
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
    paddingBottom: 18,
    gap: 4,
  },
  headerBack: { color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: FONT.mono },
  scroll: { padding: 20, gap: 16 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 10, color: T.muted, fontFamily: FONT.mono, letterSpacing: 1.5 },
  pill: {
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  pillActive: { backgroundColor: T.accent, borderColor: T.accent },
  pillText: { fontSize: 13, fontWeight: '600', color: T.dark },
  pillTextActive: { color: '#fff' },
  input: {
    backgroundColor: T.surface,
    borderWidth: 2,
    borderColor: T.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: T.text,
  },
  inputFilled: { borderColor: T.accent },
  row: { flexDirection: 'row', gap: 10 },
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: T.accentLight,
    borderWidth: 1,
    borderColor: T.accent + '44',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  totalLabel: { fontSize: 11, color: T.accent, fontFamily: FONT.mono, letterSpacing: 1 },
  totalAmount: { fontSize: 26, fontWeight: '900', color: T.accent, letterSpacing: -0.5 },
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
  debtToggleActive: { backgroundColor: T.warningLight, borderColor: T.warning },
  debtToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  debtToggleIcon: { fontSize: 20 },
  debtToggleLabel: { fontSize: 13, fontWeight: '700', color: T.dark },
  debtToggleSub: { fontSize: 11, color: T.faint, marginTop: 1 },
  toggle: {
    width: 44,
    height: 24,
    backgroundColor: T.border,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: T.warning },
  toggleThumb: {
    width: 20,
    height: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  toggleThumbOn: { transform: [{ translateX: 20 }] },
  footer: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: T.bg,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  saveBtn: {
    backgroundColor: T.accent,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: T.border },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  saveBtnTextDisabled: { color: T.muted },
  // Success
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
    marginBottom: 8,
  },
  successIcon: { fontSize: 34, color: T.green },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: T.dark,
    letterSpacing: -0.5,
    fontFamily: FONT.serif,
  },
  successItem: { fontSize: 14, color: T.muted },
  successAmount: { fontSize: 40, fontWeight: '900', color: T.green, letterSpacing: -1 },
  debtNote: {
    backgroundColor: T.warningLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  debtNoteText: { fontSize: 12, color: '#7A5F00' },
  successActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 8 },
  ghostBtn: {
    flex: 1,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ghostBtnText: { color: T.text, fontSize: 14, fontWeight: '600' },
  primaryBtn: {
    flex: 2,
    backgroundColor: T.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Photos
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: 'visible',
  },
  photoImg: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: T.border,
  },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: T.error,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  photoAdd: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: T.accent,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: T.accentLight,
  },
  photoAddLabel: { fontSize: 10, color: T.accent, fontWeight: '700' },
})
