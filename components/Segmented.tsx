import { View, Pressable, StyleSheet } from 'react-native'
import { T, FONT, R, SHADOW } from '@/constants/theme'
import { Txt } from './Txt'

type Option<K extends string> = { key: K; label: string }

type Props<K extends string> = {
  options: Option<K>[]
  value: K
  onChange: (key: K) => void
}

// A tab strip in a cream track; the selected option lifts as a paper card.
export function Segmented<K extends string>({ options, value, onChange }: Props<K>) {
  return (
    <View style={s.track} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.key === value
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[s.item, on && s.itemOn]}
          >
            <Txt style={[s.label, on && s.labelOn]}>{o.label}</Txt>
          </Pressable>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  track: { flexDirection: 'row', backgroundColor: T.surfaceHigh, borderRadius: R.md, padding: 3, gap: 2 },
  item: { flex: 1, paddingVertical: 8, borderRadius: R.md - 3, alignItems: 'center' },
  itemOn: { backgroundColor: T.surface, ...SHADOW.card },
  label: { fontFamily: FONT.sansSemi, fontSize: 13, lineHeight: 16, color: T.muted },
  labelOn: { color: T.text },
})
