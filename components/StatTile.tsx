import { View, StyleSheet } from 'react-native'
import { T, SP } from '@/constants/theme'
import { Card } from './Card'
import { Txt } from './Txt'

type Tone = 'neutral' | 'good' | 'warn' | 'bad'

type Props = {
  label: string
  value: string
  /** Line under the value; the dot in front of it takes `tone`. */
  meta?: string
  tone?: Tone
  onPress?: () => void
  /** Colour the value itself, not just the dot. */
  valueColor?: string
}

const DOT: Record<Tone, string> = {
  neutral: T.faint,
  good: T.green,
  warn: T.warning,
  bad: T.error,
}

// A KPI on paper: label, mono figure, and a one-line reading with a coloured
// dot so "3 overdue" reads as a warning before the number is read.
export function StatTile({ label, value, meta, tone = 'neutral', onPress, valueColor }: Props) {
  return (
    <Card onPress={onPress} style={s.card}>
      <Txt variant="label">{label}</Txt>
      <Txt variant="amountLg" style={[s.value, valueColor ? { color: valueColor } : null]}>{value}</Txt>
      {meta ? (
        <View style={s.metaRow}>
          <View style={[s.dot, { backgroundColor: DOT[tone] }]} />
          <Txt variant="meta" numberOfLines={1} style={s.meta}>{meta}</Txt>
        </View>
      ) : null}
    </Card>
  )
}

const s = StyleSheet.create({
  card: { flex: 1, padding: 14, gap: 3 },
  value: { marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  meta: { flex: 1 },
})
