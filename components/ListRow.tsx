import type { ReactNode } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { T, FONT, SP } from '@/constants/theme'
import { Txt } from './Txt'

type Props = {
  /** Ledger margin — a time ("10:42") or short date ("15 Sep") in mono. */
  when?: string
  /** Something else on the left, e.g. an Avatar. */
  leading?: ReactNode
  title: string
  /** Sits beside the title, e.g. a status Badge. */
  titleRight?: ReactNode
  meta?: ReactNode
  amount?: string
  amountColor?: string
  /** Small line under the amount, e.g. "paid ₦2,000". */
  sub?: ReactNode
  /** Actions on the far right: a trash icon, a WhatsApp button. */
  trailing?: ReactNode
  onPress?: () => void
  /** Drop the ruled divider on the last row of a card. */
  last?: boolean
}

// One ruled line of the ledger.
export function ListRow({
  when, leading, title, titleRight, meta, amount, amountColor, sub, trailing, onPress, last,
}: Props) {
  const body = (
    <>
      {when ? <Txt style={s.when}>{when}</Txt> : null}
      {leading}
      <View style={s.main}>
        <View style={s.titleRow}>
          <Txt variant="bodyStrong" numberOfLines={1} style={s.title}>{title}</Txt>
          {titleRight}
        </View>
        {meta ? (
          typeof meta === 'string' ? <Txt variant="meta" numberOfLines={1}>{meta}</Txt> : meta
        ) : null}
      </View>
      {amount ? (
        <View style={s.right}>
          <Txt variant="amount" style={amountColor ? { color: amountColor } : null}>{amount}</Txt>
          {sub ? (typeof sub === 'string' ? <Txt style={s.sub}>{sub}</Txt> : sub) : null}
        </View>
      ) : null}
      {trailing}
    </>
  )
  const rowStyle = [s.row, last && s.last]
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [rowStyle, pressed && s.pressed]}
      >
        {body}
      </Pressable>
    )
  }
  return <View style={rowStyle}>{body}</View>
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SP.md,
    paddingHorizontal: SP.lg,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  last: { borderBottomWidth: 0 },
  pressed: { backgroundColor: T.surfaceHigh },
  when: { fontFamily: FONT.mono, fontSize: 11, lineHeight: 14, color: T.muted, width: 42 },
  main: { flex: 1, minWidth: 0, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SP.sm },
  title: { flexShrink: 1 },
  right: { alignItems: 'flex-end', gap: 2 },
  sub: { fontFamily: FONT.sans, fontSize: 11, lineHeight: 14, color: T.muted },
})
