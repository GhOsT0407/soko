import type { ReactNode } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { T, FONT } from '@/constants/theme'
import { Txt } from './Txt'

type Props = {
  title: string
  /** A text link on the right, e.g. "All sales". */
  action?: string
  onAction?: () => void
  right?: ReactNode
}

export function SectionHeader({ title, action, onAction, right }: Props) {
  return (
    <View style={s.row}>
      <Txt variant="heading">{title}</Txt>
      {right}
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="link">
          <Txt style={s.action}>{action}</Txt>
        </Pressable>
      ) : null}
    </View>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  action: { fontFamily: FONT.sansSemi, fontSize: 13, lineHeight: 18, color: T.accent },
})
