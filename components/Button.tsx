import { Pressable, ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { T, FONT, R, SP } from '@/constants/theme'
import { Txt } from './Txt'

type IoniconName = React.ComponentProps<typeof Ionicons>['name']
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

type Props = {
  label: string
  onPress?: () => void
  variant?: Variant
  size?: Size
  icon?: IoniconName
  disabled?: boolean
  loading?: boolean
  /** Stretch to fill the row (flex: 1). */
  grow?: boolean
  style?: StyleProp<ViewStyle>
}

const FG: Record<Variant, string> = {
  primary: T.white,
  secondary: T.accentDark,
  ghost: T.accent,
  danger: T.white,
}

const ICON: Record<Size, number> = { sm: 16, md: 18, lg: 20 }

export function Button({
  label, onPress, variant = 'primary', size = 'md', icon, disabled, loading, grow, style,
}: Props) {
  const fg = FG[variant]
  const off = disabled || loading
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
      style={({ pressed }) => [
        s.base, s[variant], s[size],
        grow && s.grow,
        pressed && !off && s.pressed,
        off && s.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <View style={s.inner}>
          {icon ? <Ionicons name={icon} size={ICON[size]} color={fg} /> : null}
          <Txt style={[s.label, s[`label_${size}`], { color: fg }]}>{label}</Txt>
        </View>
      )}
    </Pressable>
  )
}

const s = StyleSheet.create({
  base: { borderRadius: R.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { flexDirection: 'row', alignItems: 'center', gap: SP.sm },
  grow: { flex: 1 },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.45 },

  primary: { backgroundColor: T.accent, borderColor: T.accent },
  secondary: { backgroundColor: T.surface, borderColor: T.borderStrong },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  danger: { backgroundColor: T.error, borderColor: T.error },

  sm: { paddingVertical: 8, paddingHorizontal: 12 },
  md: { paddingVertical: 12, paddingHorizontal: 16 },
  lg: { paddingVertical: 15, paddingHorizontal: 18 },

  label: { fontFamily: FONT.sansBold },
  label_sm: { fontSize: 13, lineHeight: 16 },
  label_md: { fontSize: 14, lineHeight: 18 },
  label_lg: { fontSize: 15, lineHeight: 20 },
})
