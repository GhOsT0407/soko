import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { T, FONT } from '@/constants/theme'
import { useStore } from '@/store'
import type { Debt } from '@/types'

export default function DebtsScreen() {
  const debts = useStore((s) => s.debts)
  const markDebtPaid = useStore((s) => s.markDebtPaid)
  const deleteDebt = useStore((s) => s.deleteDebt)

  function confirmDelete(debt: Debt) {
    Alert.alert(
      'Remove Debt Record',
      `Remove debt record for ${debt.customer}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => deleteDebt(debt.id) },
      ]
    )
  }

  const outstanding = debts.filter((d) => !d.paid)
  const settled = debts.filter((d) => d.paid)
  const totalOwed = outstanding.reduce((sum, d) => sum + d.amount, 0)

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── HERO ── */}
      <View style={s.hero}>
        <View style={s.orb1} />
        <View style={s.orb2} />
        <View style={s.orb3} />

        <Text style={s.heroMono}>CUSTOMER DEBTS</Text>

        {/* 3D Tilt Card */}
        <View style={s.heroCard}>
          <View style={s.heroCardTopEdge} />
          <View style={s.heroCardInnerGlow} />
          <Text style={s.heroCardLabel}>TOTAL OUTSTANDING</Text>
          <Text style={[
            s.heroCardAmount,
            totalOwed === 0 && { color: T.green, textShadowColor: T.greenGlow }
          ]}>
            ₦{totalOwed.toLocaleString()}
          </Text>
          <View style={s.heroCardDivider} />
          <View style={s.heroStats}>
            <View style={s.heroStat}>
              <Text style={s.heroStatLabel}>OUTSTANDING</Text>
              <Text style={[s.heroStatVal, { color: outstanding.length > 0 ? T.error : T.green }]}>
                {outstanding.length}
              </Text>
            </View>
            <View style={s.heroStatDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatLabel}>SETTLED</Text>
              <Text style={[s.heroStatVal, { color: T.green }]}>{settled.length}</Text>
            </View>
            <View style={s.heroStatDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatLabel}>RECOVERY</Text>
              <Text style={[s.heroStatVal, { color: T.accent }]}>
                {debts.length > 0
                  ? `${Math.round((settled.length / debts.length) * 100)}%`
                  : '—'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {debts.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyOrb} />
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={s.emptyTitle}>No debts recorded</Text>
            <Text style={s.emptySub}>When you mark a sale as debt, it appears here</Text>
          </View>
        ) : (
          <>
            {outstanding.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHead}>
                  <View style={s.sectionDot} />
                  <Text style={s.sectionLabel}>OUTSTANDING</Text>
                  <View style={s.sectionBadge}>
                    <Text style={s.sectionBadgeText}>{outstanding.length}</Text>
                  </View>
                </View>
                {outstanding.map((d) => (
                  <DebtCard key={d.id} debt={d} onMarkPaid={() => markDebtPaid(d.id)} onDelete={() => confirmDelete(d)} />
                ))}
              </View>
            )}

            {settled.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHead}>
                  <View style={[s.sectionDot, { backgroundColor: T.green }]} />
                  <Text style={[s.sectionLabel, { color: T.green }]}>SETTLED</Text>
                </View>
                {settled.map((d) => (
                  <DebtCard key={d.id} debt={d} isSettled onDelete={() => confirmDelete(d)} />
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

function DebtCard({
  debt,
  onMarkPaid,
  isSettled,
  onDelete,
}: {
  debt: Debt
  onMarkPaid?: () => void
  isSettled?: boolean
  onDelete?: () => void
}) {
  const daysAgo = Math.floor((Date.now() - new Date(debt.createdAt).getTime()) / 86400000)
  const isOverdue = daysAgo >= 7 && !isSettled

  return (
    <View style={[dc.card, isOverdue && dc.cardOverdue, isSettled && dc.cardSettled]}>
      {isOverdue && <View style={dc.overdueGlow} />}
      {isSettled && <View style={dc.settledGlow} />}

      {/* Left accent bar */}
      <View style={[
        dc.bar,
        isSettled && dc.barSettled,
        isOverdue && dc.barOverdue,
      ]} />

      <View style={dc.body}>
        <View style={dc.topRow}>
          <Text style={dc.name}>{debt.customer}</Text>
          <Text style={[
            dc.amount,
            isSettled && dc.amountSettled,
            isOverdue && dc.amountOverdue,
          ]}>
            ₦{debt.amount.toLocaleString()}
          </Text>
        </View>

        {debt.description ? <Text style={dc.desc}>{debt.description}</Text> : null}
        {debt.phone ? <Text style={dc.phone}>{debt.phone}</Text> : null}

        <View style={dc.footer}>
          <View style={[dc.agePill, isOverdue && dc.agePillOverdue]}>
            <Text style={[dc.age, isOverdue && dc.ageOverdue]}>
              {daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`}
              {isOverdue ? ' · OVERDUE' : ''}
            </Text>
          </View>

          <View style={dc.footerRight}>
            {isSettled ? (
              <View style={dc.settledPill}>
                <Text style={dc.settledText}>✓ Settled</Text>
              </View>
            ) : onMarkPaid ? (
              <TouchableOpacity style={dc.paidBtn} onPress={onMarkPaid} activeOpacity={0.8}>
                <View style={dc.paidBtnGlow} />
                <Text style={dc.paidBtnText}>Mark Paid ✓</Text>
              </TouchableOpacity>
            ) : null}
            {onDelete && (
              <TouchableOpacity style={dc.removeBtn} onPress={onDelete} hitSlop={8}>
                <Text style={dc.removeBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
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
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: T.error,
    opacity: 0.08,
    top: -80,
    right: -60,
  },
  orb2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: T.accentMid,
    opacity: 0.07,
    bottom: -40,
    left: -20,
  },
  orb3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: T.green,
    opacity: 0.05,
    top: 30,
    left: '50%',
  },
  heroMono: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
    fontFamily: FONT.mono,
    letterSpacing: 2,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 16,
  },
  heroCard: {
    marginHorizontal: 20,
    backgroundColor: T.glass,
    borderWidth: 1,
    borderColor: T.glassBorder,
    borderTopColor: T.glassTopBorder,
    borderRadius: 24,
    padding: 22,
    overflow: 'hidden',
    position: 'relative',
    transform: [{ perspective: 900 }, { rotateX: '-4deg' }],
    shadowColor: '#F87171',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 18,
  },
  heroCardTopEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: T.glassTopBorder,
  },
  heroCardInnerGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: T.error,
    opacity: 0.06,
    top: -40,
    right: -20,
  },
  heroCardLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.35)',
    fontFamily: FONT.mono,
    letterSpacing: 2,
    marginBottom: 6,
  },
  heroCardAmount: {
    fontSize: 44,
    fontWeight: '900',
    color: T.error,
    letterSpacing: -2,
    textShadowColor: 'rgba(248,113,113,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  heroCardDivider: {
    height: 1,
    backgroundColor: T.glassBorder,
    marginVertical: 16,
  },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  heroStat: { flex: 1, alignItems: 'center', gap: 4 },
  heroStatLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.3)',
    fontFamily: FONT.mono,
    letterSpacing: 1,
  },
  heroStatVal: { fontSize: 16, fontWeight: '800', color: '#fff' },
  heroStatDivider: { width: 1, height: 30, backgroundColor: T.glassBorder },

  scroll: { padding: 16, paddingTop: 18 },
  section: { marginBottom: 20 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.error },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: T.muted,
    fontFamily: FONT.mono,
    letterSpacing: 1.8,
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: 'rgba(248,113,113,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionBadgeText: { fontSize: 10, fontWeight: '700', color: T.error },

  empty: {
    alignItems: 'center',
    paddingTop: 70,
    gap: 10,
    position: 'relative',
  },
  emptyOrb: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: T.accentMid,
    opacity: 0.05,
    top: 0,
  },
  emptyIcon: { fontSize: 36, color: T.faint },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: T.text },
  emptySub: { fontSize: 13, color: T.muted, textAlign: 'center', paddingHorizontal: 30 },
})

const dc = StyleSheet.create({
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
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  cardOverdue: {
    borderColor: 'rgba(248,113,113,0.35)',
    borderTopColor: 'rgba(248,113,113,0.5)',
    shadowColor: T.error,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  cardSettled: {
    opacity: 0.55,
  },
  overdueGlow: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: T.error,
    opacity: 0.07,
  },
  settledGlow: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: T.green,
    opacity: 0.06,
  },

  // Left accent bar
  bar: {
    width: 3,
    backgroundColor: T.error,
    shadowColor: T.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  barSettled: { backgroundColor: T.green, shadowColor: T.green },
  barOverdue: { backgroundColor: T.error },

  body: { flex: 1, padding: 14, gap: 6 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: 14, fontWeight: '800', color: T.text, flex: 1 },
  amount: {
    fontSize: 18,
    fontWeight: '900',
    color: T.error,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(248,113,113,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  amountSettled: {
    color: T.green,
    textShadowColor: T.greenGlow,
  },
  amountOverdue: { color: T.error },
  desc: { fontSize: 12, color: T.muted },
  phone: { fontSize: 11, color: T.faint, fontFamily: FONT.mono },

  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  agePill: {
    backgroundColor: T.surface,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  agePillOverdue: { backgroundColor: 'rgba(248,113,113,0.1)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.2)' },
  age: { fontSize: 9, color: T.faint, fontFamily: FONT.mono, letterSpacing: 0.5 },
  ageOverdue: { color: T.error },

  paidBtn: {
    backgroundColor: T.greenDark,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: T.green,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
  paidBtnGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: T.green,
    opacity: 0.7,
  },
  paidBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  settledPill: {
    backgroundColor: T.greenLight,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.3)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  settledText: { fontSize: 11, color: T.green, fontWeight: '700' },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  removeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: T.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { fontSize: 11, color: T.error, fontWeight: '700' },
})
