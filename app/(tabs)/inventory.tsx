import { useState, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { T, FONT } from '@/constants/theme'
import { TAILORED } from '@/constants/data'
import { useStore } from '@/store'
import type { BusinessTypeId } from '@/constants/data'
import type { InventoryItem } from '@/types'

export default function InventoryScreen() {
  const inventory = useStore((s) => s.inventory)
  const deleteInventoryItem = useStore((s) => s.deleteInventoryItem)
  const profile = useStore((s) => s.profile)
  const btypeId = (profile.businessType || 'trader') as BusinessTypeId
  const tailored = TAILORED[btypeId]

  const [query, setQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  const filtered = useMemo(() => {
    if (!query.trim()) return inventory
    const q = query.toLowerCase()
    return inventory.filter(
      (i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
    )
  }, [inventory, query])

  const lowStock = filtered.filter((i) => i.qty <= i.lowStockAt)
  const normal = filtered.filter((i) => i.qty > i.lowStockAt)

  const totalValue = inventory.reduce((sum, i) => sum + i.qty * i.sellingPrice, 0)
  const totalCost = inventory.reduce((sum, i) => sum + i.qty * i.buyingPrice, 0)
  const potentialProfit = totalValue - totalCost

  function confirmDelete(item: InventoryItem) {
    Alert.alert(
      'Remove Item',
      `Remove "${item.name}" from inventory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => deleteInventoryItem(item.id) },
      ]
    )
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── HERO ── */}
      <View style={s.hero}>
        <View style={s.orb1} />
        <View style={s.orb2} />

        <View style={s.heroTop}>
          <View>
            <Text style={s.heroMono}>{tailored.inventoryLabel.toUpperCase()}</Text>
            <Text style={s.heroTitle}>
              {inventory.length} item{inventory.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => router.push('/inventory/new')} activeOpacity={0.8}>
            <View style={s.addBtnGlow} />
            <Text style={s.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* 3D value card */}
        <View style={s.valueCard}>
          <View style={s.valueCardTopEdge} />
          <View style={s.valueCardOrb} />
          <View style={s.valueCardRow}>
            <View style={s.valueStat}>
              <Text style={s.valueStatLabel}>STOCK VALUE</Text>
              <Text style={s.valueStatAmount}>₦{totalValue.toLocaleString()}</Text>
            </View>
            {potentialProfit > 0 && (
              <>
                <View style={s.valueCardDivider} />
                <View style={s.valueStat}>
                  <Text style={s.valueStatLabel}>POTENTIAL PROFIT</Text>
                  <Text style={[s.valueStatAmount, { color: T.green, fontSize: 20 }]}>
                    ₦{potentialProfit.toLocaleString()}
                  </Text>
                </View>
              </>
            )}
            {lowStock.length > 0 && (
              <>
                <View style={s.valueCardDivider} />
                <View style={s.valueStat}>
                  <Text style={s.valueStatLabel}>LOW STOCK</Text>
                  <Text style={[s.valueStatAmount, { color: T.warning, fontSize: 24 }]}>
                    {lowStock.length}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Search bar */}
      {inventory.length > 0 && (
        <View style={s.searchWrap}>
          <View style={[s.searchBar, searchFocused && s.searchBarFocused]}>
            <Ionicons name="search-outline" size={16} color={T.faint} />
            <TextInput
              style={s.searchInput}
              placeholder="Search items or categories…"
              placeholderTextColor={T.faint}
              value={query}
              onChangeText={setQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              returnKeyType="search"
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={T.faint} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {inventory.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyOrb} />
            <Ionicons name="cube-outline" size={44} color={T.faint} />
            <Text style={s.emptyTitle}>No stock items yet</Text>
            <Text style={s.emptySub}>Tap + Add to start tracking inventory</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/inventory/new')}>
              <Text style={s.emptyBtnText}>+ Add First Item</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="search-outline" size={36} color={T.faint} />
            <Text style={s.emptyTitle}>No matches</Text>
            <Text style={s.emptySub}>Try a different search term</Text>
          </View>
        ) : (
          <>
            {lowStock.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHead}>
                  <View style={[s.sectionDot, { backgroundColor: T.warning }]} />
                  <Text style={[s.sectionLabel, { color: T.warning }]}>LOW STOCK</Text>
                  <View style={s.sectionBadge}>
                    <Text style={s.sectionBadgeText}>{lowStock.length}</Text>
                  </View>
                </View>
                {lowStock.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    isLow
                    onEdit={() => router.push(`/inventory/${item.id}` as any)}
                    onDelete={() => confirmDelete(item)}
                  />
                ))}
              </View>
            )}

            {normal.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHead}>
                  <View style={[s.sectionDot, { backgroundColor: T.green }]} />
                  <Text style={s.sectionLabel}>IN STOCK</Text>
                </View>
                {normal.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    isLow={false}
                    onEdit={() => router.push(`/inventory/${item.id}` as any)}
                    onDelete={() => confirmDelete(item)}
                  />
                ))}
              </View>
            )}
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

function ItemCard({
  item,
  isLow,
  onEdit,
  onDelete,
}: {
  item: InventoryItem
  isLow: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const profit = item.sellingPrice - item.buyingPrice
  const margin =
    item.buyingPrice > 0 && item.sellingPrice > 0
      ? Math.round((profit / item.sellingPrice) * 100)
      : null
  const isGoodMargin = margin !== null && margin >= 20

  return (
    <View style={[ic.card, isLow && ic.cardLow]}>
      {isLow && <View style={ic.lowGlow} />}
      <View style={[ic.bar, isLow ? ic.barLow : ic.barNormal]} />

      <View style={ic.body}>
        <View style={ic.topRow}>
          <View style={ic.nameWrap}>
            <Text style={ic.name}>{item.name}</Text>
            <View style={ic.catPill}>
              <Text style={ic.catPillText}>{item.category}</Text>
            </View>
          </View>

          <View style={ic.qtyBadge}>
            <Text style={[ic.qty, isLow && ic.qtyLow]}>{item.qty}</Text>
            <Text style={[ic.qtyUnit, isLow && { color: T.warning }]}>units</Text>
          </View>
        </View>

        <View style={ic.priceRow}>
          <Text style={ic.price}>₦{item.sellingPrice.toLocaleString()} / unit</Text>
          {margin !== null && (
            <View style={[ic.marginBadge, !isGoodMargin && ic.marginBadgeLow]}>
              <Text style={[ic.marginText, !isGoodMargin && ic.marginTextLow]}>
                {margin}% margin
              </Text>
            </View>
          )}
        </View>

        {margin !== null && (
          <Text style={[ic.profitLine, isGoodMargin ? { color: T.green } : { color: T.warning }]}>
            +₦{profit.toLocaleString()} profit per unit
          </Text>
        )}

        {isLow && (
          <View style={ic.lowAlert}>
            <Text style={ic.lowAlertText}>⚠ Restock needed · below {item.lowStockAt} unit threshold</Text>
          </View>
        )}

        {/* Action row */}
        <View style={ic.actionRow}>
          <TouchableOpacity style={ic.editBtn} onPress={onEdit} activeOpacity={0.8}>
            <Ionicons name="create-outline" size={13} color={T.accent} />
            <Text style={ic.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={ic.deleteBtn} onPress={onDelete} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={13} color={T.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  hero: {
    backgroundColor: T.dark,
    paddingBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  orb1: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: T.accentMid,
    opacity: 0.1,
    top: -70,
    right: -60,
  },
  orb2: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: T.green,
    opacity: 0.07,
    bottom: -30,
    left: 20,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 16,
  },
  heroMono: { fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: FONT.mono, letterSpacing: 2, marginBottom: 4 },
  heroTitle: { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  addBtn: {
    backgroundColor: T.accentDark,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: T.accentMid,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  addBtnGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1.5,
    backgroundColor: T.accent,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  valueCard: {
    marginHorizontal: 20,
    backgroundColor: T.glass,
    borderWidth: 1,
    borderColor: T.glassBorder,
    borderTopColor: T.glassTopBorder,
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: T.accentMid,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 14,
  },
  valueCardTopEdge: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: T.glassTopBorder,
  },
  valueCardOrb: {
    position: 'absolute',
    width: 100, height: 100,
    borderRadius: 50,
    backgroundColor: T.accentMid,
    opacity: 0.1,
    top: -20, right: -10,
  },
  valueCardRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 0 },
  valueStat: { flex: 1, gap: 5, minWidth: 80 },
  valueStatLabel: { fontSize: 8, color: 'rgba(255,255,255,0.35)', fontFamily: FONT.mono, letterSpacing: 1.5 },
  valueStatAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: T.revenue,
    letterSpacing: -1,
    textShadowColor: T.revenueGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  valueCardDivider: { width: 1, height: 40, backgroundColor: T.glassBorder, marginHorizontal: 14 },

  searchWrap: { paddingHorizontal: 14, paddingVertical: 10 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  searchBarFocused: { borderColor: T.accent },
  searchInput: { flex: 1, fontSize: 14, color: T.text },

  scroll: { padding: 14, paddingTop: 6 },
  section: { marginBottom: 20 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.muted },
  sectionLabel: { flex: 1, fontSize: 9, fontWeight: '700', color: T.muted, fontFamily: FONT.mono, letterSpacing: 1.8 },
  sectionBadge: {
    backgroundColor: 'rgba(252,211,77,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(252,211,77,0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionBadgeText: { fontSize: 10, fontWeight: '700', color: T.warning },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10, position: 'relative' },
  emptyOrb: {
    position: 'absolute',
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: T.accentMid, opacity: 0.05, top: 0,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: T.text },
  emptySub: { fontSize: 13, color: T.muted, textAlign: 'center' },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: T.accentDark,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 11,
    shadowColor: T.accentMid,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})

const ic = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    borderTopColor: T.glassBorder,
    borderRadius: 18,
    marginBottom: 10,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  cardLow: {
    borderColor: 'rgba(252,211,77,0.3)',
    borderTopColor: 'rgba(252,211,77,0.5)',
    shadowColor: T.warning,
    shadowOpacity: 0.2,
  },
  lowGlow: {
    position: 'absolute', top: -30, right: -20,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: T.warning, opacity: 0.06,
  },
  bar: { width: 3 },
  barNormal: { backgroundColor: T.green },
  barLow: { backgroundColor: T.warning },
  body: { flex: 1, padding: 14, gap: 6 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  nameWrap: { flex: 1, gap: 5 },
  name: { fontSize: 14, fontWeight: '800', color: T.text },
  catPill: {
    alignSelf: 'flex-start',
    backgroundColor: T.accentLight,
    borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  catPillText: { fontSize: 9, fontWeight: '700', color: T.accent, letterSpacing: 0.3 },
  qtyBadge: {
    backgroundColor: T.cardHigh,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8,
    alignItems: 'center',
    minWidth: 52,
  },
  qty: {
    fontSize: 24,
    fontWeight: '900',
    color: T.green,
    letterSpacing: -1,
    textShadowColor: T.greenGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  qtyLow: { color: T.warning, textShadowColor: T.warningGlow },
  qtyUnit: { fontSize: 8, color: T.green, fontFamily: FONT.mono, letterSpacing: 0.5 },

  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: 12, color: T.muted },
  marginBadge: { backgroundColor: T.greenLight, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  marginBadgeLow: { backgroundColor: T.warningLight },
  marginText: { fontSize: 10, fontWeight: '700', color: T.green },
  marginTextLow: { color: T.warning },
  profitLine: { fontSize: 11, fontFamily: FONT.mono },
  lowAlert: {
    backgroundColor: 'rgba(252,211,77,0.08)',
    borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(252,211,77,0.2)',
  },
  lowAlertText: { fontSize: 10, color: T.warning, fontFamily: FONT.mono },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: T.accentLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editBtnText: { fontSize: 11, fontWeight: '700', color: T.accent },
  deleteBtn: {
    backgroundColor: T.errorLight,
    borderRadius: 8,
    padding: 6,
  },
})
