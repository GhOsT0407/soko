import { useState } from 'react'
import { View, TextInput, StyleSheet, type TextInputProps, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { T, FONT, R, SP } from '@/constants/theme'
import { Txt } from './Txt'

type IoniconName = React.ComponentProps<typeof Ionicons>['name']

type Props = TextInputProps & {
  label?: string
  /** Tint the label — green for a cash field, amber for credit. */
  labelColor?: string
  icon?: IoniconName
  hint?: string
  /** Monospace — for API keys, phone numbers and ₦ amounts. */
  mono?: boolean
  /** Bigger type for the one number a form is really about. */
  large?: boolean
  containerStyle?: StyleProp<ViewStyle>
}

export function Input({
  label, labelColor, icon, hint, mono, large, containerStyle, style, onFocus, onBlur, ...rest
}: Props) {
  const [focused, setFocused] = useState(false)
  return (
    <View style={[s.wrap, containerStyle]}>
      {label ? <Txt variant="label" color={labelColor}>{label}</Txt> : null}
      <View style={[s.field, focused && s.focused]}>
        {icon ? <Ionicons name={icon} size={16} color={focused ? T.accent : T.faint} style={s.icon} /> : null}
        <TextInput
          placeholderTextColor={T.faint}
          selectionColor={T.accent}
          {...rest}
          onFocus={(e) => { setFocused(true); onFocus?.(e) }}
          onBlur={(e) => { setFocused(false); onBlur?.(e) }}
          style={[s.input, mono && s.mono, large && s.large, style]}
        />
      </View>
      {hint ? <Txt variant="meta">{hint}</Txt> : null}
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { gap: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.borderStrong,
    borderRadius: R.md,
    paddingHorizontal: SP.md,
  },
  focused: { borderColor: T.accent },
  icon: { marginRight: SP.sm },
  input: { flex: 1, fontFamily: FONT.sans, fontSize: 15, color: T.text, paddingVertical: 11 },
  mono: { fontFamily: FONT.mono, fontSize: 14 },
  large: { fontSize: 20, paddingVertical: 12 },
})
