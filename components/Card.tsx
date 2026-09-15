import { View, Pressable, StyleSheet, type ViewProps, type StyleProp, type ViewStyle } from 'react-native'
import { T, R, SP, SHADOW } from '@/constants/theme'

type Tone = 'surface' | 'tint' | 'accent'

type Props = ViewProps & {
  tone?: Tone
  padded?: boolean
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

// A sheet of paper. `surface` is the default card; `tint` is the darker cream
// used for notes; `accent` is the teal wash used for the one thing on a screen
// that should draw the eye.
export function Card({ tone = 'surface', padded = true, onPress, style, children, ...rest }: Props) {
  const styles = [s.base, s[tone], padded && s.padded, style]
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles, pressed && s.pressed]}
        accessibilityRole="button"
        {...rest}
      >
        {children}
      </Pressable>
    )
  }
  return (
    <View style={styles} {...rest}>
      {children}
    </View>
  )
}

const s = StyleSheet.create({
  base: { borderRadius: R.lg, borderWidth: 1 },
  padded: { padding: SP.lg },
  pressed: { opacity: 0.85 },
  surface: { backgroundColor: T.surface, borderColor: T.border, ...SHADOW.card },
  tint: { backgroundColor: T.surfaceHigh, borderColor: T.surfaceHigh },
  accent: { backgroundColor: T.accentLight, borderColor: T.accentLight },
})
