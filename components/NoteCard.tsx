import { StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { T, SP } from '@/constants/theme'
import { Card } from './Card'
import { Txt } from './Txt'

type Props = { text: string }

// The pencilled note in the margin — the day's summary in the owner's voice.
export function NoteCard({ text }: Props) {
  return (
    <Card tone="tint" style={s.card}>
      <Ionicons name="pencil-outline" size={16} color={T.accent} style={s.icon} />
      <Txt variant="note" style={s.text}>{text}</Txt>
    </Card>
  )
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: SP.md, padding: 14 },
  icon: { marginTop: 3 },
  text: { flex: 1 },
})
