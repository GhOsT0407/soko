import { View, Pressable, StyleSheet } from 'react-native'
import { T, FONT } from '@/constants/theme'
import { Txt } from './Txt'
import { initialOf } from '@/lib/format'

type Props = {
  name: string | undefined | null
  size?: number
  /** Teal for the owner; cream for customers in a list. */
  tone?: 'accent' | 'quiet'
  onPress?: () => void
  accessibilityLabel?: string
}

export function Avatar({ name, size = 40, tone = 'accent', onPress, accessibilityLabel }: Props) {
  const inner = (
    <View
      style={[
        s.disc,
        tone === 'accent' ? s.accent : s.quiet,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Txt style={[s.letter, { fontSize: Math.round(size * 0.42), lineHeight: Math.round(size * 0.5) }, tone === 'quiet' && s.letterQuiet]}>
        {initialOf(name)}
      </Txt>
    </View>
  )
  if (!onPress) return inner
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} hitSlop={6}>
      {inner}
    </Pressable>
  )
}

const s = StyleSheet.create({
  disc: { alignItems: 'center', justifyContent: 'center' },
  accent: { backgroundColor: T.accent },
  quiet: { backgroundColor: T.surfaceHigh, borderWidth: 1, borderColor: T.border },
  letter: { fontFamily: FONT.serifSemi, color: T.white },
  letterQuiet: { color: T.textSub },
})
