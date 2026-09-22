import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { T } from '@/constants/theme'

type IoniconName = React.ComponentProps<typeof Ionicons>['name']

type Props = {
  icon: IoniconName
  onPress?: () => void
  /** `primary` is the filled teal circle; `quiet` is paper with a hairline. */
  variant?: 'primary' | 'quiet'
  size?: number
  color?: string
  disabled?: boolean
  accessibilityLabel: string
  style?: StyleProp<ViewStyle>
}

export function IconButton({
  icon, onPress, variant = 'quiet', size = 40, color, disabled, accessibilityLabel, style,
}: Props) {
  const fg = color ?? (variant === 'primary' ? T.white : T.textSub)
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed }) => [
        s.base, s[variant],
        { width: size, height: size, borderRadius: size / 2 },
        pressed && !disabled && s.pressed,
        disabled && s.disabled,
        style,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={fg} />
    </Pressable>
  )
}

const s = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  primary: { backgroundColor: T.accent, borderColor: T.accent },
  quiet: { backgroundColor: T.surface, borderColor: T.borderStrong },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.4 },
})
