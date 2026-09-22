import { Redirect } from 'expo-router'
import { useStore } from '@/store'
import { SKIP_AUTH } from '@/constants/dev'

export default function Index() {
  const session = useStore((s) => s.session)
  const activeBusiness = useStore((s) => s.activeBusiness)

  // In preview mode (SKIP_AUTH, anonymous sign-in unavailable) there is no
  // session but the root layout has set a placeholder business.
  if (!session && !(SKIP_AUTH && activeBusiness)) return <Redirect href="/auth" />
  if (!activeBusiness) return <Redirect href="/onboarding/business" />
  return <Redirect href="/(tabs)" />
}
