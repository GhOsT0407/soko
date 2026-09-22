import { View, Pressable, Switch, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { T, R, SP } from '@/constants/theme'
import { Txt } from './Txt'

type IoniconName = React.ComponentProps<typeof Ionicons>['name']

type Props = {
  icon: IoniconName
  title: string
  sub?: string
  value: boolean
  onChange: (v: boolean) => void
  /** Amber for "this becomes a debt"; teal for everything else. */
  tone?: 'accent' | 'warn'
}

// A card-shaped switch. The whole row is the tap target, and the card tints
// when it's on so the state is visible before the thumb is read.
export function ToggleRow({ icon, title, sub, value, onChange, tone = 'accent' }: Props) {
  const on = tone === 'warn' ? T.warning : T.accent
  const onBg = tone === 'warn' ? T.warningLight : T.accentLight
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      style={[s.row, value && { backgroundColor: onBg, borderColor: on }]}
    >
      <View style={[s.disc, value && { backgroundColor: T.surface }]}>
        <Ionicons name={icon} size={16} color={value ? on : T.muted} />
      </View>
      <View style={s.text}>
        <Txt variant="bodyStrong" color={value ? on : T.text}>{title}</Txt>
        {sub ? <Txt variant="meta">{sub}</Txt> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: T.borderStrong, true: on }}
        thumbColor={T.white}
        ios_backgroundColor={T.borderStrong}
      />
    </Pressable>
  )
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SP.md,
    padding: SP.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: T.borderStrong,
    backgroundColor: T.surface,
  },
  disc: {
    width: 32, height: 32, borderRadius: R.sm,
    backgroundColor: T.surfaceHigh,
    alignItems: 'center', justifyContent: 'center',
  },
  text: { flex: 1, gap: 1 },
})
