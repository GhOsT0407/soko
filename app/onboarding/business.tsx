import { useState } from 'react'
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { router } from 'expo-router'
import { SP } from '@/constants/theme'
import type { BusinessTypeId } from '@/constants/data'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'
import { Screen, Txt, Button, Input, Avatar, BusinessTypePicker, ModalFooter, IconButton } from '@/components'

export default function CreateBusinessScreen() {
  const session = useStore((s) => s.session)
  const setActiveBusiness = useStore((s) => s.setActiveBusiness)
  // Reached from Settings ("Add another business") when one already exists;
  // first-run has nothing to go back to.
  const hasBusiness = useStore((s) => s.activeBusiness != null)

  const [name, setName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [type, setType] = useState<BusinessTypeId>('trader')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!name.trim() || !session) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('businesses')
        .insert({
          user_id: session.user.id,
          name: name.trim(),
          owner_name: ownerName.trim(),
          type,
        })
        .select()
        .single()

      if (error) throw error
      setActiveBusiness(data)
      router.replace('/(tabs)')
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not create business.')
    } finally {
      setLoading(false)
    }
  }

  const ready = name.trim().length > 0

  return (
    <Screen>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {hasBusiness ? (
            <IconButton icon="arrow-back" onPress={() => router.back()} accessibilityLabel="Back" style={s.back} />
          ) : null}

          <View style={s.brand}>
            <Avatar name="Soko" size={56} />
            <Txt variant="title" align="center">
              {hasBusiness ? 'Add another business' : 'Set up your business'}
            </Txt>
            <Txt variant="meta" align="center">This takes 30 seconds. You can change everything later.</Txt>
          </View>

          <Input
            label="Business name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Mama Chioma Provisions"
            returnKeyType="next"
            autoFocus
          />
          <Input
            label="Your name (optional)"
            value={ownerName}
            onChangeText={setOwnerName}
            placeholder="e.g. Chioma Okafor"
            returnKeyType="done"
          />

          <View style={s.gapSm}>
            <Txt variant="label">What kind of business</Txt>
            <BusinessTypePicker value={type} onChange={setType} />
          </View>
        </ScrollView>

        <ModalFooter>
          <Button
            grow size="lg"
            onPress={handleCreate}
            disabled={!ready}
            loading={loading}
            label={ready ? 'Start keeping the books' : 'Enter a business name'}
          />
        </ModalFooter>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: SP.xl, gap: SP.xl },
  back: { alignSelf: 'flex-start' },
  brand: { alignItems: 'center', gap: SP.sm, paddingVertical: SP.sm },
  gapSm: { gap: SP.sm },
})
