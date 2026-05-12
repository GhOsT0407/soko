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
import { SALE_CATEGORIES, TAILORED } from '@/constants/data'
import { useStore } from '@/store'
import type { BusinessTypeId } from '@/constants/data'
import type { InventoryItem } from '@/types'

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export default function NewInventoryScreen() {
  const profile = useStore((s) => s.profile)
  const addInventoryItem = useStore((s) => s.addInventoryItem)

  const btypeId = (profile.businessType || 'trader') as BusinessTypeId
  const categories = SALE_CATEGORIES[btypeId] || SALE_CATEGORIES.trader
  const tailored = TAILORED[btypeId] || TAILORED.trader

  const [name, setName] = useState('')
  const [category, setCategory] = useState(categories[0])
  const [qty, setQty] = useState('')
  const [buyingPrice, setBuyingPrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [lowStockAt, setLowStockAt] = useState('5')
  const [saved, setSaved] = useState(false)

  const buying = parseFloat(buyingPrice) || 0
  const selling = parseFloat(sellingPrice) || 0
  const profit = selling - buying
  const margin = selling > 0 && buying > 0 ? Math.round((profit / selling) * 100) : null
  const isGoodMargin = margin !== null && margin >= 20
  const isBadMargin = margin !== null && margin < 0

  const canSave = name.trim().length > 0 && parseFloat(qty) > 0

  function handleSave() {
    if (!canSave) return
    addInventoryItem({
      id: uid(),
      name: name.trim(),
      category,
      qty: parseFloat(qty),
      buyingPrice: buying,
      sellingPrice: selling,
      lowStockAt: parseFloat(lowStockAt) || 5,
      createdAt: new Date().toISOString(),
    })
    setSaved(true)
  }

  if (saved) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.success}>
          <View style={s.successOrb} />
          <View style={s.successOrb2} />
          <View style={s.successCircle}>
            <View style={s.successCircleGlow} />
            <Text style={s.successIcon}>✓</Text>
          </View>
          <Text style={s.successTitle}>Item Added!</Text>
          <Text style={s.successName}>{name}</Text>
          <Text style={s.successQty}>{qty} units in stock</Text>
          {margin !== null && (
            <View style={[s.successMargin, isBadMargin && s.successMarginBad]}>
              <Text style={[s.successMarginText, isBadMargin && s.successMarginTextBad]}>
                {margin}% margin · ₦{profit.toLocaleString()} profit/unit
              </Text>
            </View>
          )}
          <View style={s.successActions}>
            <TouchableOpacity style={s.ghostBtn} onPress={() => router.back()}>
              <Text style={s.ghostBtnText}>Back to Stock</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => {
                setName(''); setQty(''); setBuyingPrice('')
                setSellingPrice(''); setLowStockAt('5')
                setCategory(categories[0]); setSaved(false)
              }}
            >
              <Text style={s.primaryBtnText}>+ Add Another</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerOrb} />
          <View style={s.headerOrb2} />
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Add {tailored.inventoryLabel}</Text>
          <Text style={s.headerSub}>{profile.businessName || 'Your Business'}</Text>
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Category */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[s.pill, category === cat && s.pillActive]}
                  onPress={() => setCategory(cat)}
                >
                  {category === cat && <View style={s.pillGlow} />}
                  <Text style={[s.pillText, category === cat && s.pillTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Name */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>ITEM NAME</Text>
            <TextInput
              style={[s.input, name.length > 0 && s.inputFilled]}
              placeholder="e.g. Blue Ankara"
              placeholderTextColor={T.faint}
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>

          {/* Quantity */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>QUANTITY IN STOCK</Text>
            <TextInput
              style={[s.input, qty.length > 0 && s.inputFilled]}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={T.faint}
              value={qty}
              onChangeText={setQty}
            />
          </View>

          {/* Prices */}
          <View style={s.twoCol}>
            <View style={[s.fieldGroup, { flex: 1 }]}>
              <Text style={s.fieldLabel}>BUYING PRICE (₦)</Text>
              <TextInput
                style={[s.input, buyingPrice.length > 0 && s.inputFilled]}
                keyboardType="numeric"
                placeholder="Cost"
                placeholderTextColor={T.faint}
                value={buyingPrice}
                onChangeText={setBuyingPrice}
              />
            </View>
            <View style={[s.fieldGroup, { flex: 1 }]}>
              <Text style={s.fieldLabel}>SELLING PRICE (₦)</Text>
              <TextInput
                style={[s.input, sellingPrice.length > 0 && s.inputFilled]}
                keyboardType="numeric"
                placeholder="Price"
                placeholderTextColor={T.faint}
                value={sellingPrice}
                onChangeText={setSellingPrice}
              />
            </View>
          </View>

          {/* Live margin card */}
          {margin !== null && (
            <View style={[
              s.marginCard,
              isBadMargin && s.marginCardBad,
              !isGoodMargin && !isBadMargin && s.marginCardWarn,
            ]}>
              <View style={s.marginCardOrb} />
              <View style={s.marginCardTopEdge} />
              <Text style={s.marginCardLabel}>PROFIT MARGIN</Text>
              <Text style={[
                s.marginPct,
                isBadMargin && s.marginPctBad,
                !isGoodMargin && !isBadMargin && s.marginPctWarn,
              ]}>
                {margin}%
              </Text>
              <Text style={s.marginProfit}>
                ₦{profit.toLocaleString()} profit per unit
              </Text>
              {!isGoodMargin && !isBadMargin && (
                <View style={s.marginAlert}>
                  <Text style={s.marginAlertText}>⚠ Low margin — consider raising price</Text>
                </View>
              )}
              {isBadMargin && (
                <View style={[s.marginAlert, s.marginAlertBad]}>
                  <Text style={[s.marginAlertText, { color: T.error }]}>⚠ Selling below cost!</Text>
                </View>
              )}
            </View>
          )}

          {/* Low stock threshold */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>LOW STOCK ALERT THRESHOLD</Text>
            <TextInput
              style={[s.input, s.inputSmall, lowStockAt.length > 0 && s.inputFilled]}
              keyboardType="numeric"
              placeholder="5"
              placeholderTextColor={T.faint}
              value={lowStockAt}
              onChangeText={setLowStockAt}
            />
            <Text style={s.fieldHint}>Alert when qty drops below this number</Text>
          </View>
        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity
            style={[s.saveBtn, !canSave && s.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            {canSave && <View style={s.saveBtnTopEdge} />}
            <Text style={[s.saveBtnText, !canSave && s.saveBtnTextDisabled]}>
              {canSave ? `Save "${name.trim()}"  ·  ${qty} units` : 'Fill in name & quantity'}
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
    overflow: 'hidden',
    position: 'relative',
    gap: 4,
  },
  headerOrb: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: T.accentMid,
    opacity: 0.1,
    top: -70,
    right: -50,
  },
  headerOrb2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: T.revenueDark,
    opacity: 0.06,
    bottom: -30,
    left: 20,
  },
  backText: { color: 'rgba(255,255,255,0.35)', fontSize: 14, marginBottom: 6 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: FONT.mono },

  scroll: { padding: 20, gap: 18 },
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 9, color: T.muted, fontFamily: FONT.mono, letterSpacing: 1.8 },
  fieldHint: { fontSize: 10, color: T.faint, fontFamily: FONT.mono, marginTop: 2 },

  pill: {
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    borderTopColor: T.glassBorder,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  pillActive: {
    backgroundColor: T.accentLight,
    borderColor: T.accentMid,
    borderTopColor: T.accent,
    shadowColor: T.accentMid,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  pillGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1.5,
    backgroundColor: T.accent,
  },
  pillText: { fontSize: 13, fontWeight: '600', color: T.muted },
  pillTextActive: { color: T.accent },

  input: {
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    borderTopColor: T.glassBorder,
    borderRadius: 14,
    padding: 15,
    fontSize: 16,
    color: T.text,
  },
  inputSmall: { fontSize: 15 },
  inputFilled: {
    borderColor: T.accentMid,
    borderTopColor: T.accent,
    shadowColor: T.accentMid,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  twoCol: { flexDirection: 'row', gap: 12 },

  // Margin card
  marginCard: {
    backgroundColor: T.greenLight,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.25)',
    borderTopColor: 'rgba(52,211,153,0.5)',
    borderRadius: 18,
    padding: 18,
    overflow: 'hidden',
    position: 'relative',
    transform: [{ perspective: 700 }, { rotateX: '-3deg' }],
    shadowColor: T.green,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    gap: 4,
  },
  marginCardBad: {
    backgroundColor: T.errorLight,
    borderColor: 'rgba(248,113,113,0.25)',
    borderTopColor: 'rgba(248,113,113,0.5)',
    shadowColor: T.error,
  },
  marginCardWarn: {
    backgroundColor: T.warningLight,
    borderColor: 'rgba(252,211,77,0.25)',
    borderTopColor: 'rgba(252,211,77,0.5)',
    shadowColor: T.warning,
  },
  marginCardOrb: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: T.green,
    opacity: 0.1,
    top: -20,
    right: -10,
  },
  marginCardTopEdge: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1.5,
    backgroundColor: 'rgba(52,211,153,0.5)',
  },
  marginCardLabel: {
    fontSize: 9,
    color: 'rgba(52,211,153,0.6)',
    fontFamily: FONT.mono,
    letterSpacing: 1.5,
  },
  marginPct: {
    fontSize: 40,
    fontWeight: '900',
    color: T.green,
    letterSpacing: -1.5,
    textShadowColor: T.greenGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  marginPctBad: { color: T.error, textShadowColor: 'rgba(248,113,113,0.3)' },
  marginPctWarn: { color: T.warning, textShadowColor: T.warningGlow },
  marginProfit: { fontSize: 12, color: T.muted, fontFamily: FONT.mono },
  marginAlert: {
    backgroundColor: 'rgba(252,211,77,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
  },
  marginAlertBad: { backgroundColor: 'rgba(248,113,113,0.1)' },
  marginAlertText: { fontSize: 11, color: T.warning, fontFamily: FONT.mono },

  footer: {
    padding: 16,
    paddingBottom: 28,
    backgroundColor: T.bg,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  saveBtn: {
    backgroundColor: T.accentDark,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: T.accentMid,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 14,
  },
  saveBtnDisabled: {
    backgroundColor: T.card,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnTopEdge: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1.5,
    backgroundColor: T.accent,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  saveBtnTextDisabled: { color: T.faint },

  // Success
  success: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  successOrb: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: T.accentMid,
    opacity: 0.06,
    top: -80,
    right: -80,
  },
  successOrb2: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: T.green,
    opacity: 0.06,
    bottom: -60,
    left: -60,
  },
  successCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: T.greenLight,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
    shadowColor: T.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  successCircleGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 50,
    backgroundColor: T.green,
    opacity: 0.1,
  },
  successIcon: { fontSize: 36, color: T.green },
  successTitle: { fontSize: 28, fontWeight: '800', color: T.text, letterSpacing: -0.5 },
  successName: { fontSize: 14, color: T.muted },
  successQty: {
    fontSize: 22,
    fontWeight: '900',
    color: T.accent,
    letterSpacing: -0.5,
    textShadowColor: T.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  successMargin: {
    backgroundColor: T.greenLight,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.25)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  successMarginBad: {
    backgroundColor: T.errorLight,
    borderColor: 'rgba(248,113,113,0.25)',
  },
  successMarginText: { fontSize: 13, color: T.green, fontWeight: '700', fontFamily: FONT.mono },
  successMarginTextBad: { color: T.error },
  successActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 8 },
  ghostBtn: {
    flex: 1,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    borderTopColor: T.glassBorder,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  ghostBtnText: { color: T.text, fontSize: 14, fontWeight: '700' },
  primaryBtn: {
    flex: 1,
    backgroundColor: T.accentDark,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: T.accentMid,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
})
