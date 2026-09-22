import { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, Alert } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { T, SP } from '@/constants/theme'
import { BUSINESS_TYPES, type BusinessTypeId } from '@/constants/data'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'
import type { Business } from '@/types'
import {
  Screen, Txt, Card, Button, Input, IconButton, Badge, ListRow, SectionHeader, Avatar,
  BusinessTypePicker, ModalHeader,
} from '@/components'

function typeLabel(id: string) {
  return BUSINESS_TYPES.find((b) => b.id === id)?.label.split(' / ')[0] ?? id
}

export default function SettingsScreen() {
  const activeBusiness = useStore((s) => s.activeBusiness)
  const setActiveBusiness = useStore((s) => s.setActiveBusiness)
  const businesses = useStore((s) => s.businesses)
  const setBusinesses = useStore((s) => s.setBusinesses)
  const apiKey = useStore((s) => s.apiKey)
  const setApiKey = useStore((s) => s.setApiKey)
  const session = useStore((s) => s.session)

  const [name, setName] = useState(activeBusiness?.name || '')
  const [ownerName, setOwnerName] = useState(activeBusiness?.owner_name || '')
  const [type, setType] = useState<BusinessTypeId>((activeBusiness?.type as BusinessTypeId) || 'trader')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!session) return
    supabase
      .from('businesses')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at')
      .then(({ data }) => { if (data) setBusinesses(data) })
  }, [session])

  function switchBusiness(biz: Business) {
    if (biz.id === activeBusiness?.id) return
    // setActiveBusiness clears the data cache itself — see decisions/clear-cache-in-store-not-call-sites
    setActiveBusiness(biz)
    setName(biz.name)
    setOwnerName(biz.owner_name)
    setType(biz.type as BusinessTypeId)
    setDirty(false)
  }

  function markDirty() { if (!dirty) setDirty(true) }

  async function handleSave() {
    if (!activeBusiness) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('businesses')
        .update({ name: name.trim(), owner_name: ownerName.trim(), type })
        .eq('id', activeBusiness.id)
        .select()
        .single()
      if (error) throw error
      setActiveBusiness(data)
      setDirty(false)
      Alert.alert('Saved', 'Business profile updated.')
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleSignOut() {
    Alert.alert('Sign out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
          setActiveBusiness(null)
          router.replace('/auth')
        },
      },
    ])
  }

  function handleRemoveKey() {
    Alert.alert('Remove API key', 'Disconnect the assistant?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setApiKey('') },
    ])
  }

  return (
    <Screen>
      <ModalHeader title="Settings" back />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Business profile */}
        <View style={s.section}>
          <SectionHeader title="Business profile" />
          <Card style={s.form}>
            <Input
              label="Business name"
              value={name}
              onChangeText={(v) => { setName(v); markDirty() }}
              placeholder="Business name"
            />
            <Input
              label="Owner name"
              value={ownerName}
              onChangeText={(v) => { setOwnerName(v); markDirty() }}
              placeholder="Your name"
            />
            <View style={s.gapSm}>
              <Txt variant="label">Business type</Txt>
              <BusinessTypePicker value={type} onChange={(id) => { setType(id); markDirty() }} />
            </View>
            {dirty ? (
              <Button label="Save changes" onPress={handleSave} loading={saving} disabled={!name.trim()} />
            ) : null}
          </Card>
        </View>

        {/* Businesses */}
        <View style={s.section}>
          <SectionHeader
            title="My businesses"
            action="Add another"
            onAction={() => router.push('/onboarding/business' as any)}
          />
          <Card padded={false}>
            {businesses.map((biz, idx) => {
              const active = biz.id === activeBusiness?.id
              return (
                <ListRow
                  key={biz.id}
                  leading={<Avatar name={biz.name} size={36} tone={active ? 'accent' : 'quiet'} />}
                  title={biz.name}
                  titleRight={active ? <Badge label="Current" tone="accent" /> : undefined}
                  meta={typeLabel(biz.type)}
                  trailing={active ? <Ionicons name="checkmark-circle" size={20} color={T.accent} /> : <View style={s.spacer} />}
                  onPress={() => switchBusiness(biz)}
                  last={idx === businesses.length - 1}
                />
              )
            })}
          </Card>
        </View>

        {/* Account + assistant */}
        <View style={s.section}>
          <SectionHeader title="Account" />
          <Card padded={false}>
            <ListRow
              leading={<Ionicons name="person-circle-outline" size={22} color={T.muted} />}
              title={session?.user.email ?? '—'}
              meta="Signed in"
            />
            <ListRow
              leading={<Ionicons name="sparkles" size={20} color={apiKey ? T.green : T.faint} />}
              title="Assistant"
              meta={apiKey ? `Gemini key ····${apiKey.slice(-6)}` : 'Not connected'}
              trailing={
                apiKey ? (
                  <Button label="Remove" size="sm" variant="secondary" onPress={handleRemoveKey} />
                ) : (
                  <Button label="Set up" size="sm" variant="secondary" onPress={() => router.navigate('/(tabs)/ai')} />
                )
              }
              last
            />
          </Card>
        </View>

        <Button label="Sign out" icon="log-out-outline" variant="secondary" onPress={handleSignOut} style={s.signOut} />

        <View style={s.about}>
          <Txt variant="note" align="center">Soko · Your business, in your pocket.</Txt>
          <Txt variant="meta" align="center">v2.0.0</Txt>
        </View>
      </ScrollView>
    </Screen>
  )
}

const s = StyleSheet.create({
  scroll: { padding: SP.xl, gap: SP.xl, paddingBottom: SP.xxl },
  section: { gap: SP.sm },
  form: { gap: SP.lg },
  gapSm: { gap: SP.sm },
  spacer: { width: 20 },
  signOut: { alignSelf: 'stretch' },
  about: { alignItems: 'center', gap: SP.xs },
})
