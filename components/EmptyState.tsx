import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { T, SP } from '@/constants/theme'
import { Txt } from './Txt'
import { Button } from './Button'

type IoniconName = React.ComponentProps<typeof Ionicons>['name']

type Props = {
  icon: IoniconName
  title: string
  body?: string
  action?: string
  onAction?: () => void
  /** Teal icon disc for "all clear" states; muted for genuinely empty ones. */
  tone?: 'quiet' | 'good'
}

export function EmptyState({ icon, title, body, action, onAction, tone = 'quiet' }: Props) {
  const good = tone === 'good'
  return (
    <View style={s.wrap}>
      <View style={[s.disc, good && s.discGood]}>
        <Ionicons name={icon} size={24} color={good ? T.green : T.muted} />
      </View>
      <Txt variant="heading" align="center" style={s.stretch}>{title}</Txt>
      {body ? <Txt variant="meta" align="center" style={[s.stretch, s.body]}>{body}</Txt> : null}
      {action ? <Button label={action} onPress={onAction} variant="secondary" size="sm" style={s.btn} /> : null}
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: SP.xl, gap: SP.sm },
  disc: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: T.surfaceHigh,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SP.xs,
  },
  discGood: { backgroundColor: T.greenLight },
  stretch: { alignSelf: 'stretch' },
  body: { lineHeight: 18, paddingHorizontal: SP.lg },
  btn: { marginTop: SP.sm },
})
