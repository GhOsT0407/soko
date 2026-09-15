import { Text, StyleSheet, type TextProps, type TextStyle } from 'react-native'
import { T, FONT } from '@/constants/theme'

// The type scale. Lora carries the "notebook" moments (greeting, day total,
// section headings); Instrument Sans does the UI; JetBrains Mono sets every
// ₦ figure so amounts line up in a column.
export type TxtVariant =
  | 'display'     // the day total
  | 'title'       // screen titles, greeting
  | 'heading'     // section headings
  | 'body'
  | 'bodyStrong'
  | 'meta'        // secondary line under a row title
  | 'label'       // small caps eyebrow
  | 'amount'      // ₦ in a row
  | 'amountLg'    // ₦ in a stat tile
  | 'note'        // the italic summary

type Props = TextProps & {
  variant?: TxtVariant
  color?: string
  align?: TextStyle['textAlign']
}

export function Txt({ variant = 'body', color, align, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[s[variant], color ? { color } : null, align ? { textAlign: align } : null, style]}
    />
  )
}

const s = StyleSheet.create({
  display: { fontFamily: FONT.serifSemi, fontSize: 42, lineHeight: 48, letterSpacing: -0.8, color: T.text },
  title: { fontFamily: FONT.serifSemi, fontSize: 22, lineHeight: 28, letterSpacing: -0.2, color: T.text },
  heading: { fontFamily: FONT.serifSemi, fontSize: 17, lineHeight: 22, color: T.text },
  body: { fontFamily: FONT.sans, fontSize: 14, lineHeight: 20, color: T.text },
  bodyStrong: { fontFamily: FONT.sansSemi, fontSize: 14, lineHeight: 20, color: T.text },
  meta: { fontFamily: FONT.sans, fontSize: 12, lineHeight: 16, color: T.muted },
  label: { fontFamily: FONT.sansSemi, fontSize: 11, lineHeight: 14, letterSpacing: 0.8, textTransform: 'uppercase', color: T.muted },
  amount: { fontFamily: FONT.monoBold, fontSize: 14, lineHeight: 18, color: T.text },
  amountLg: { fontFamily: FONT.monoBold, fontSize: 20, lineHeight: 24, letterSpacing: -0.3, color: T.text },
  note: { fontFamily: FONT.serifItalic, fontSize: 14, lineHeight: 21, color: T.textSub },
})
