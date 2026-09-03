import { Redirect } from 'expo-router'
import { useStore } from '@/store'

export default function Index() {
  const session = useStore((s) => s.session)
  const activeBusiness = useStore((s) => s.activeBusiness)

  if (!session) return <Redirect href="/auth" />
  if (!activeBusiness) return <Redirect href="/onboarding/business" />
  return <Redirect href="/(tabs)" />
}
