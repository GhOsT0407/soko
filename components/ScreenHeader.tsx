import type { ReactNode } from 'react'
import { View, StyleSheet } from 'react-native'
import { SP } from '@/constants/theme'
import { Txt } from './Txt'

type Props = {
  title: string
  subtitle?: string
  /** Buttons on the right — IconButtons, usually. */
  right?: ReactNode
}

// Top of every secondary tab: a serif title, optional one-line subtitle, and
// the screen's actions. No hairline — the content below sets its own edge.
export function ScreenHeader({ title, subtitle, right }: Props) {
  return (
    <View style={s.row}>
      <View style={s.text}>
        <Txt variant="title">{title}</Txt>
        {subtitle ? <Txt variant="meta">{subtitle}</Txt> : null}
      </View>
      {right ? <View style={s.right}>{right}</View> : null}
    </View>
  )
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SP.xl,
    paddingTop: SP.md,
    paddingBottom: SP.lg,
    gap: SP.md,
  },
  text: { flex: 1, gap: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: SP.sm },
})
