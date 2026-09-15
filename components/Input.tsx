import { View, TextInput, StyleSheet, type TextInputProps, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { T, FONT, R, SP } from '@/constants/theme'
import { Txt } from './Txt'

type IoniconName = React.ComponentProps<typeof Ionicons>['name']

type Props = TextInputProps & {
  label?: string
  icon?: IoniconName
  hint?: string
  /** Monospace — for API keys and phone numbers. */
  mono?: boolean
  containerStyle?: StyleProp<ViewStyle>
}

export function Input({ label, icon, hint, mono, containerStyle, style, ...rest }: Props) {
  return (
    <View style={[s.wrap, containerStyle]}>
      {label ? <Txt variant="label">{label}</Txt> : null}
      <View style={s.field}>
        {icon ? <Ionicons name={icon} size={16} color={T.faint} style={s.icon} /> : null}
        <TextInput
          placeholderTextColor={T.faint}
          selectionColor={T.accent}
          {...rest}
          style={[s.input, mono && s.mono, style]}
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
  icon: { marginRight: SP.sm },
  input: { flex: 1, fontFamily: FONT.sans, fontSize: 14, color: T.text, paddingVertical: 11 },
  mono: { fontFamily: FONT.mono, fontSize: 13 },
})
