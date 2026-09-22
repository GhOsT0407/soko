import type { ReactNode } from 'react'
import { View, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { T, SP } from '@/constants/theme'
import { Txt } from './Txt'
import { IconButton } from './IconButton'

type Props = {
  title: string
  /** An action on the right — a trash IconButton, usually. Keeps the title centred either way. */
  right?: ReactNode
  onClose?: () => void
  /** Arrow instead of an X — for pages pushed from the side rather than sheets. */
  back?: boolean
}

// Top of every sheet that slides up over the tabs: close on the left, a serif
// title in the middle, one optional action on the right, and a ruled line
// underneath so the sheet reads as its own page.
export function ModalHeader({ title, right, onClose, back }: Props) {
  return (
    <View style={s.row}>
      <IconButton icon={back ? 'arrow-back' : 'close'} size={36} onPress={onClose ?? (() => router.back())} accessibilityLabel={back ? 'Back' : 'Close'} />
      <Txt variant="heading" numberOfLines={1} style={s.title}>{title}</Txt>
      <View style={s.slot}>{right}</View>
    </View>
  )
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SP.lg,
    paddingVertical: SP.md,
    gap: SP.md,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  title: { flex: 1, textAlign: 'center' },
  slot: { width: 36, alignItems: 'flex-end' },
})
