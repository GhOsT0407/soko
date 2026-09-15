import { StyleSheet, type ViewProps } from 'react-native'
import { SafeAreaView, type Edge } from 'react-native-safe-area-context'
import { T } from '@/constants/theme'

type Props = ViewProps & { edges?: Edge[] }

// Cream paper ground behind every tab screen.
export function Screen({ edges = ['top'], style, ...rest }: Props) {
  return <SafeAreaView edges={edges} style={[s.screen, style]} {...rest} />
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
})
