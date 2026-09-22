import { View, Pressable, StyleSheet } from 'react-native'
import { T, FONT, R, SP } from '@/constants/theme'
import { BUSINESS_TYPES, type BusinessTypeId } from '@/constants/data'
import { Txt } from './Txt'

type Props = {
  value: string
  onChange: (id: BusinessTypeId) => void
}

// The one list of business types (from constants/data) as a wrapped grid of
// cards — used by onboarding and by Settings so the ids can never drift from
// what the dashboard's tailored copy expects.
export function BusinessTypePicker({ value, onChange }: Props) {
  return (
    <View style={s.grid}>
      {BUSINESS_TYPES.map((bt) => {
        const on = bt.id === value
        return (
          <Pressable
            key={bt.id}
            onPress={() => onChange(bt.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={({ pressed }) => [s.card, on && s.on, pressed && s.pressed]}
          >
            <Txt style={s.emoji}>{bt.emoji}</Txt>
            <View style={s.text}>
              <Txt variant="bodyStrong" numberOfLines={1} color={on ? T.accentDark : T.text}>
                {bt.label.split(' / ')[0]}
              </Txt>
              <Txt variant="meta" numberOfLines={1}>{bt.desc}</Txt>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm },
  card: {
    // Two per row with the gap accounted for
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SP.sm,
    padding: SP.md,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: T.borderStrong,
    backgroundColor: T.surface,
  },
  on: { borderColor: T.accent, backgroundColor: T.accentLight },
  pressed: { opacity: 0.8 },
  emoji: { fontFamily: FONT.sans, fontSize: 20, lineHeight: 26 },
  text: { flex: 1, minWidth: 0 },
})
