import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { T, FONT, R, SP } from '@/constants/theme'
import { Txt } from './Txt'

type Props = {
  label: string
  /** A second, mono line under the label — the price on a quick-add chip. */
  sub?: string
  selected?: boolean
  onPress?: () => void
  /** Stretch to share a row equally with its siblings. */
  grow?: boolean
  style?: StyleProp<ViewStyle>
}

// A pill you can pick. Selected fills teal; the rest sit as paper on the page.
export function Chip({ label, sub, selected, onPress, grow, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [s.chip, selected && s.on, grow && s.grow, pressed && s.pressed, style]}
    >
      <Txt numberOfLines={1} style={[s.label, selected && s.labelOn]}>{label}</Txt>
      {sub ? <Txt style={[s.sub, selected && s.subOn]}>{sub}</Txt> : null}
    </Pressable>
  )
}

const s = StyleSheet.create({
  chip: {
    paddingVertical: 9,
    paddingHorizontal: SP.md,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: T.borderStrong,
    backgroundColor: T.surface,
    alignItems: 'center',
    gap: 1,
  },
  on: { backgroundColor: T.accent, borderColor: T.accent },
  grow: { flex: 1 },
  pressed: { opacity: 0.8 },
  label: { fontFamily: FONT.sansSemi, fontSize: 13, lineHeight: 16, color: T.textSub, maxWidth: 120 },
  labelOn: { color: T.white },
  sub: { fontFamily: FONT.mono, fontSize: 11, lineHeight: 14, color: T.accent },
  subOn: { color: T.accentLight },
})
