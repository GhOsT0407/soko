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
  Alert,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { T, FONT } from '@/constants/theme'
import { SALE_CATEGORIES, TAILORED } from '@/constants/data'
import { useStore } from '@/store'
import type { BusinessTypeId } from '@/constants/data'

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export default function EditInventoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const profile = useStore((s) => s.profile)
  const inventory = useStore((s) => s.inventory)
  const updateInventoryItem = useStore((s) => s.updateInventoryItem)
  const deleteInventoryItem = useStore((s) => s.deleteInventoryItem)

  const item = inventory.find((i) => i.id === id)

  const btypeId = (profile.businessType || 'trader') as BusinessTypeId
  const categories = SALE_CATEGORIES[btypeId] || SALE_CATEGORIES.trader
  const tailored = TAILORED[btypeId] || TAILORED.trader

  const [name, setName] = useState(item?.name ?? '')
  const [category, setCategory] = useState(item?.category ?? categories[0])
  const [qty, setQty] = useState(item ? String(item.qty) : '')
  const [buyingPrice, setBuyingPrice] = useState(item?.buyingPrice ? String(item.buyingPrice) : '')
  const [sellingPrice, setSellingPrice] = useState(item?.sellingPrice ? String(item.sellingPrice) : '')
  const [lowStockAt, setLowStockAt] = useState(item ? String(item.lowStockAt) : '5')
  const [saved, setSaved] = useState(false)

  const buying = parseFloat(buyingPrice) || 0
  const selling = parseFloat(sellingPrice) || 0
  const profit = selling - buying
  const margin = selling > 0 && buying > 0 ? Math.round((profit / selling) * 100) : null
  const isGoodMargin = margin !== null && margin >= 20
  const isBadMargin = margin !== null && margin < 0

  const canSave = name.trim().length > 0 && parseFloat(qty) > 0

  if (!item) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.notFound}>
          <Text style={s.notFoundText}>Item not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.backLink}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  function handleSave() {
    if (!canSave) return
    updateInventoryItem(id!, {
      name: name.trim(),
      category,
      qty: parseFloat(qty),
      buyingPrice: buying,
      sellingPrice: selling,
      lowStockAt: parseFloat(lowStockAt) || 5,
    })
    setSaved(true)
  }

  function handleDelete() {
    Alert.alert(
      'Remove Item',
      `Remove "${item!.name}" from inventory? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            deleteInventoryItem(id!)
            router.back()
          },
        },
      ]
    )
  }

  if (saved) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.success}>
          <View style={s.successCircle}>
            <Text style={s.successIcon}>✓</Text>
          </View>
          <Text style={s.successTitle}>Updated!</Text>
          <Text style={s.successName}>{name}</Text>
          <Text style={s.successQty}>{qty} units in stock</Text>
          {margin !== null && (
            <View style={[s.successMargin, isBadMargin && s.successMarginBad]}>
              <Text style={[s.successMarginText, isBadMargin && s.successMarginTextBad]}>
                {margin}% margin · ₦{profit.toLocaleString()} profit/unit
              </Text>
            </View>
          )}
          <TouchableOpacity style={s.doneBtn} onPress={() => router.back()}>
            <Text style={s.doneBtnText}>Back to Stock</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.header}>
          <View style={s.headerOrb} />
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={s.headerRow}>
            <Text style={s.headerTitle}>Edit {tailored.inventoryLabel}</Text>
            <TouchableOpacity style={s.deleteHeaderBtn} onPress={handleDelete}>
              <Text style={s.deleteHeaderBtnText}>Remove</Text>
            </TouchableOpacity>
          </View>
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
                  <Text style={[s.pillText, category === cat && s.pillTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>ITEM NAME</Text>
            <TextInput
              style={[s.input, name.length > 0 && s.inputFilled]}
              placeholder="Item name"
              placeholderTextColor={T.faint}
              value={name}
              onChangeText={setName}
            />
          </View>

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

          {margin !== null && (
            <View style={[
              s.marginCard,
              isBadMargin && s.marginCardBad,
              !isGoodMargin && !isBadMargin && s.marginCardWarn,
            ]}>
              <Text style={s.marginCardLabel}>PROFIT MARGIN</Text>
              <Text style={[
                s.marginPct,
                isBadMargin && s.marginPctBad,
                !isGoodMargin && !isBadMargin && s.marginPctWarn,
              ]}>
                {margin}%
              </Text>
              <Text style={s.marginProfit}>₦{profit.toLocaleString()} profit per unit</Text>
            </View>
          )}

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>LOW STOCK ALERT THRESHOLD</Text>
            <TextInput
              style={[s.input, lowStockAt.length > 0 && s.inputFilled]}
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
            <Text style={[s.saveBtnText, !canSave && s.saveBtnTextDisabled]}>
              {canSave ? `Save Changes` : 'Fill in name & quantity'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: 16, color: T.muted },
  backLink: { color: T.accent, fontWeight: '600', fontSize: 14 },

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
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: T.accentMid, opacity: 0.1,
    top: -70, right: -50,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backText: { color: 'rgba(255,255,255,0.35)', fontSize: 14, marginBottom: 6 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  deleteHeaderBtn: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteHeaderBtnText: { color: T.error, fontWeight: '700', fontSize: 12 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: FONT.mono },

  scroll: { padding: 20, gap: 18 },
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 9, color: T.muted, fontFamily: FONT.mono, letterSpacing: 1.8 },
  fieldHint: { fontSize: 10, color: T.faint, fontFamily: FONT.mono, marginTop: 2 },
  twoCol: { flexDirection: 'row', gap: 12 },

  pill: {
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  pillActive: { backgroundColor: T.accentLight, borderColor: T.accentMid },
  pillText: { fontSize: 13, fontWeight: '600', color: T.muted },
  pillTextActive: { color: T.accent },

  input: {
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    padding: 15,
    fontSize: 16,
    color: T.text,
  },
  inputFilled: { borderColor: T.accentMid },

  marginCard: {
    backgroundColor: T.greenLight,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.25)',
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  marginCardBad: { backgroundColor: T.errorLight, borderColor: 'rgba(248,113,113,0.25)' },
  marginCardWarn: { backgroundColor: T.warningLight, borderColor: 'rgba(252,211,77,0.25)' },
  marginCardLabel: { fontSize: 9, color: 'rgba(52,211,153,0.6)', fontFamily: FONT.mono, letterSpacing: 1.5 },
  marginPct: { fontSize: 36, fontWeight: '900', color: T.green, letterSpacing: -1 },
  marginPctBad: { color: T.error },
  marginPctWarn: { color: T.warning },
  marginProfit: { fontSize: 12, color: T.muted, fontFamily: FONT.mono },

  footer: { padding: 16, paddingBottom: 28, backgroundColor: T.bg, borderTopWidth: 1, borderTopColor: T.border },
  saveBtn: {
    backgroundColor: T.accentDark,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: T.accentMid,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 14,
  },
  saveBtnDisabled: { backgroundColor: T.card, shadowOpacity: 0, elevation: 0 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  saveBtnTextDisabled: { color: T.faint },

  success: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  successCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: T.greenLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    shadowColor: T.green, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  successIcon: { fontSize: 34, color: T.green },
  successTitle: { fontSize: 26, fontWeight: '800', color: T.text },
  successName: { fontSize: 14, color: T.muted },
  successQty: { fontSize: 20, fontWeight: '900', color: T.accent },
  successMargin: {
    backgroundColor: T.greenLight,
    borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  successMarginBad: { backgroundColor: T.errorLight },
  successMarginText: { fontSize: 13, color: T.green, fontWeight: '700', fontFamily: FONT.mono },
  successMarginTextBad: { color: T.error },
  doneBtn: {
    marginTop: 8,
    backgroundColor: T.accent,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
