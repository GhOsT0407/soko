import { View, StyleSheet } from 'react-native'
import { T, FONT, R } from '@/constants/theme'
import { Txt } from './Txt'

export type BadgeTone = 'neutral' | 'good' | 'warn' | 'bad' | 'accent'

type Props = { label: string; tone?: BadgeTone; mono?: boolean }

const TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  neutral: { bg: T.surfaceHigh, fg: T.textSub },
  good: { bg: T.greenLight, fg: T.greenDark },
  warn: { bg: T.warningLight, fg: T.warning },
  bad: { bg: T.errorLight, fg: T.error },
  accent: { bg: T.accentLight, fg: T.accentDark },
}

// State encoded in form, not just words: paid / partial / overdue read at a
// glance from the tint before the label is even parsed.
export function Badge({ label, tone = 'neutral', mono }: Props) {
  const c = TONES[tone]
  return (
    <View style={[s.badge, { backgroundColor: c.bg }]}>
      <Txt style={[s.text, mono && s.mono, { color: c.fg }]}>{label}</Txt>
    </View>
  )
}

const s = StyleSheet.create({
  badge: { borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  text: { fontFamily: FONT.sansBold, fontSize: 11, lineHeight: 14 },
  mono: { fontFamily: FONT.monoBold, fontSize: 11 },
})
