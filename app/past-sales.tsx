import { useState } from 'react'
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { T, SP, R } from '@/constants/theme'
import { plural } from '@/lib/format'
import { useStore } from '@/store'
import { supabase } from '@/lib/supabase'
import { extractSalesFromPhotos, RATE_LIMIT_DELAY_MS, sleep, type ExtractedSale } from '@/services/ai'
import { Screen, Txt, Card, Button, Input, IconButton, NoteCard, ModalHeader, ModalFooter } from '@/components'

type PhotoAsset = { uri: string; base64: string }
type ReviewSale = ExtractedSale & { _key: string; _keep: boolean }

type Step = 'select' | 'review'

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default function PastSalesScreen() {
  const apiKey = useStore((s) => s.apiKey)
  const activeBusiness = useStore((s) => s.activeBusiness)
  const session = useStore((s) => s.session)

  const [step, setStep] = useState<Step>('select')
  const [photos, setPhotos] = useState<PhotoAsset[]>([])
  const [picking, setPicking] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 })
  const [reviewed, setReviewed] = useState<ReviewSale[]>([])

  // ── Step 1: select photos ──────────────────────────────────────────────────

  async function handleAddPhotos() {
    setPicking(true)
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.7,
        base64: true,
        // No selectionLimit — iOS allows up to 100 per session, Android unlimited.
        // Users can tap "Add more photos" repeatedly to accumulate beyond 100.
      })
      if (!result.canceled) {
        const fresh = result.assets
          .filter((a) => a.base64)
          .map((a) => ({ uri: a.uri, base64: a.base64! }))
        setPhotos((prev) => {
          const existing = new Set(prev.map((p) => p.uri))
          return [...prev, ...fresh.filter((f) => !existing.has(f.uri))]
        })
      }
    } finally {
      setPicking(false)
    }
  }

  function handleRemovePhoto(uri: string) {
    setPhotos((prev) => prev.filter((p) => p.uri !== uri))
  }

  async function handleExtract() {
    if (!apiKey) {
      Alert.alert('No API key', 'Go to the Assistant tab and connect your Gemini API key first.')
      return
    }

    const BATCH = 5 // photos per request — keeps payload small and reliable
    const allBase64 = photos.map((p) => p.base64)
    const batches: string[][] = []
    for (let i = 0; i < allBase64.length; i += BATCH) {
      batches.push(allBase64.slice(i, i + BATCH))
    }

    setExtracting(true)
    setBatchProgress({ done: 0, total: batches.length })

    const allExtracted: ExtractedSale[] = []
    try {
      for (let i = 0; i < batches.length; i++) {
        const results = await extractSalesFromPhotos(apiKey, batches[i])
        allExtracted.push(...results)
        setBatchProgress({ done: i + 1, total: batches.length })
        if (i < batches.length - 1) await sleep(RATE_LIMIT_DELAY_MS)
      }

      if (allExtracted.length === 0) {
        Alert.alert(
          'Nothing found',
          "The AI couldn't find any sales in these photos. Try clearer or closer images.",
        )
        return
      }

      setReviewed(allExtracted.map((e) => ({ ...e, _key: genId(), _keep: true })))
      setStep('review')
    } catch (e: any) {
      Alert.alert('Extraction failed', e.message || 'Something went wrong. Try fewer photos at once.')
    } finally {
      setExtracting(false)
      setBatchProgress({ done: 0, total: 0 })
    }
  }

  function handleCancel() {
    if (photos.length > 0 || step === 'review') {
      Alert.alert(
        'Discard changes?',
        'Going back will lose any unsaved data.',
        [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ]
      )
    } else {
      router.back()
    }
  }

  // ── Step 2: review extracted sales ────────────────────────────────────────

  function toggleKeep(key: string) {
    setReviewed((prev) =>
      prev.map((r) => (r._key === key ? { ...r, _keep: !r._keep } : r))
    )
  }

  function updateField(key: string, field: keyof ExtractedSale, value: string) {
    setReviewed((prev) =>
      prev.map((r) => {
        if (r._key !== key) return r
        if (field === 'total') return { ...r, total: parseFloat(value) || 0 }
        return { ...r, [field]: value || null }
      })
    )
  }

  async function handleSave() {
    const toSave = reviewed.filter((r) => r._keep)
    if (toSave.length === 0) {
      Alert.alert('Nothing selected', 'Tick at least one sale to save.')
      return
    }
    if (!activeBusiness || !session) return
    setSaving(true)
    const rows = toSave.map((r) => ({
      business_id: activeBusiness.id,
      user_id: session.user.id,
      item: r.item || 'Unknown item',
      category: 'General',
      qty: 1,
      price: r.total || 0,
      total: r.total || 0,
      customer: r.customer || '',
      is_debt: false,
      notes: '',
      created_at: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
    }))
    const { error } = await supabase.from('sales').insert(rows)
    setSaving(false)
    if (error) {
      Alert.alert('Error', error.message)
      return
    }
    useStore.getState().clearCache()
    Alert.alert(
      `${plural(rows.length, 'sale')} saved`,
      'Your past sales have been added to your records.',
      [{ text: 'Done', onPress: () => router.back() }]
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const keptCount = reviewed.filter((r) => r._keep).length

  return (
    <Screen>
      <ModalHeader
        title={step === 'select' ? 'Import past sales' : 'Check what was read'}
        onClose={handleCancel}
      />

      {/* ── SELECT STEP ── */}
      {step === 'select' ? (
        <>
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
            <Txt variant="meta">
              {photos.length === 0
                ? 'Photograph your old notebook pages or receipts and the assistant will read the sales off them.'
                : `${plural(photos.length, 'photo')} ready`}
            </Txt>

            <Pressable
              onPress={handleAddPhotos}
              disabled={picking || extracting}
              accessibilityRole="button"
              style={({ pressed }) => [s.drop, pressed && s.pressed]}
            >
              {picking ? (
                <ActivityIndicator color={T.accent} />
              ) : (
                <>
                  <Ionicons name="images-outline" size={32} color={T.accent} />
                  <Txt variant="heading">{photos.length === 0 ? 'Choose photos' : 'Add more photos'}</Txt>
                  <Txt variant="meta" align="center">Pick as many as you like — tap again to add another batch</Txt>
                </>
              )}
            </Pressable>

            {photos.length > 0 ? (
              <View style={s.grid}>
                {photos.map((p) => (
                  <View key={p.uri} style={s.photoWrap}>
                    <Image source={{ uri: p.uri }} style={s.photo} resizeMode="cover" />
                    <IconButton
                      icon="close"
                      size={22}
                      variant="primary"
                      onPress={() => handleRemovePhoto(p.uri)}
                      accessibilityLabel="Remove photo"
                      style={s.remove}
                    />
                  </View>
                ))}
              </View>
            ) : null}

            {photos.length > 0 && !apiKey ? (
              <Card tone="tint" style={s.warn}>
                <Ionicons name="warning-outline" size={16} color={T.warning} />
                <Txt variant="meta" color={T.warning} style={s.grow}>
                  No Gemini key connected. Add one on the Assistant tab, then come back.
                </Txt>
              </Card>
            ) : null}
          </ScrollView>

          {photos.length > 0 ? (
            <ModalFooter>
              <Button
                grow size="lg"
                icon={extracting ? 'hourglass-outline' : 'sparkles'}
                onPress={handleExtract}
                disabled={extracting}
                label={
                  !extracting ? 'Read sales with AI'
                  : batchProgress.total > 0
                    ? `Reading batch ${Math.min(batchProgress.done + 1, batchProgress.total)} of ${batchProgress.total}…`
                    : 'Preparing…'
                }
              />
            </ModalFooter>
          ) : null}
        </>
      ) : null}

      {/* ── REVIEW STEP ── */}
      {step === 'review' ? (
        <>
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <NoteCard text="Untick anything that looks wrong and fix the rest before saving." />

            {reviewed.map((r) => (
              <Card key={r._key} style={[s.review, !r._keep && s.reviewOff]}>
                <Pressable
                  onPress={() => toggleKeep(r._key)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: r._keep }}
                  hitSlop={8}
                  style={[s.tick, r._keep && s.tickOn]}
                >
                  {r._keep ? <Ionicons name="checkmark" size={14} color={T.white} /> : null}
                </Pressable>

                <View style={s.fields}>
                  <Input
                    label="Item"
                    value={r.item}
                    onChangeText={(v) => updateField(r._key, 'item', v)}
                    editable={r._keep}
                  />
                  <Input
                    label="Amount (₦)"
                    mono
                    value={r.total ? String(r.total) : ''}
                    onChangeText={(v) => updateField(r._key, 'total', v)}
                    keyboardType="numeric"
                    placeholder="0"
                    editable={r._keep}
                  />
                  <View style={s.row}>
                    <Input
                      label="Date"
                      mono
                      value={r.date || ''}
                      onChangeText={(v) => updateField(r._key, 'date', v)}
                      placeholder="YYYY-MM-DD"
                      editable={r._keep}
                      containerStyle={s.grow}
                    />
                    <Input
                      label="Customer"
                      value={r.customer || ''}
                      onChangeText={(v) => updateField(r._key, 'customer', v)}
                      placeholder="Optional"
                      editable={r._keep}
                      containerStyle={s.grow}
                    />
                  </View>
                </View>
              </Card>
            ))}
          </ScrollView>

          <ModalFooter>
            <Button
              grow size="lg"
              onPress={handleSave}
              disabled={keptCount === 0}
              loading={saving}
              label={keptCount === 0 ? 'Nothing ticked' : `Save ${plural(keptCount, 'sale')}`}
            />
          </ModalFooter>
        </>
      ) : null}
    </Screen>
  )
}

const PHOTO = 96

const s = StyleSheet.create({
  scroll: { padding: SP.xl, gap: SP.lg },
  row: { flexDirection: 'row', gap: SP.md },
  grow: { flex: 1 },
  pressed: { opacity: 0.8 },

  drop: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: T.accent,
    borderRadius: R.xl,
    backgroundColor: T.surface,
    paddingVertical: SP.xxl,
    paddingHorizontal: SP.xl,
    alignItems: 'center',
    gap: SP.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.md },
  photoWrap: { width: PHOTO, height: PHOTO },
  photo: { width: PHOTO, height: PHOTO, borderRadius: R.md, backgroundColor: T.surfaceHigh },
  remove: { position: 'absolute', top: -7, right: -7, backgroundColor: T.error, borderColor: T.error },
  warn: { flexDirection: 'row', alignItems: 'flex-start', gap: SP.sm },

  review: { flexDirection: 'row', gap: SP.md, padding: SP.md },
  reviewOff: { opacity: 0.45 },
  tick: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5, borderColor: T.borderStrong,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  tickOn: { backgroundColor: T.accent, borderColor: T.accent },
  fields: { flex: 1, gap: SP.md },
})
