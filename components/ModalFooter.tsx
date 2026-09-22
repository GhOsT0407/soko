import type { ReactNode } from 'react'
import { View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { T, SP } from '@/constants/theme'

// The strip pinned under a form: usually one big Button, sometimes two side
// by side. Sits above the home indicator on its own.
export function ModalFooter({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, SP.lg) }]}>
      {children}
    </View>
  )
}

const s = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    gap: SP.md,
    padding: SP.lg,
    borderTopWidth: 1,
    borderTopColor: T.border,
    backgroundColor: T.bg,
  },
})
