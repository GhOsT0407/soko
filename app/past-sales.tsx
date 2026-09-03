import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { T, FONT } from '@/constants/theme'
import { useStore } from '@/store'
import { supabase } from '@/lib/supabase'
import { extractSalesFromPhotos, RATE_LIMIT_DELAY_MS, sleep, type ExtractedSale } from '@/services/ai'

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
        // Users can tap "Add More Photos" repeatedly to accumulate beyond 100.
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
      Alert.alert('No API Key', 'Go to the AI tab and connect your Gemini API key first.')
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
      Alert.alert('Nothing selected', 'Toggle on at least one sale to save.')
      return
    }
    if (!activeBusiness || !session) return
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
    if (error) {
      Alert.alert('Error', error.message)
      return
    }
    Alert.alert(
      `${rows.length} sale${rows.length !== 1 ? 's' : ''} saved`,
      'Your past sales have been added to your records.',
      [{ text: 'Done', onPress: () => router.back() }]
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const keptCount = reviewed.filter((r) => r._keep).length

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleCancel} hitSlop={12} style={s.headerSide}>
          <Text style={s.cancelBtn}>Cancel</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>
            {step === 'select' ? 'Import Past Sales' : 'Review Extracted Sales'}
          </Text>
          <Text style={s.headerSub}>
            {step === 'select'
              ? photos.length === 0
                ? 'Add photos of your records'
                : `${photos.length} photo${photos.length !== 1 ? 's' : ''} ready`
              : `${keptCount} of ${reviewed.length} selected`}
          </Text>
        </View>
        <View style={s.headerSide}>
          {step === 'review' && (
            <TouchableOpacity onPress={handleSave} hitSlop={12}>
              <Text style={s.doneBtn}>Save</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── SELECT STEP ── */}
      {step === 'select' && (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Add photos button */}
          <TouchableOpacity
            style={[s.addBox, picking && s.addBoxLoading]}
            onPress={handleAddPhotos}
            activeOpacity={0.75}
            disabled={picking || extracting}
          >
            {picking ? (
              <ActivityIndicator color={T.accent} />
            ) : (
              <>
                <Ionicons name="images-outline" size={36} color={T.accent} />
                <Text style={s.addBoxTitle}>
                  {photos.length === 0 ? 'Select Photos' : 'Add More Photos'}
                </Text>
                <Text style={s.addBoxSub}>
                  Select as many as you want — tap again to add more batches
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Photo grid */}
          {photos.length > 0 && (
            <View style={s.grid}>
              {photos.map((p) => (
                <View key={p.uri} style={s.photoWrap}>
                  <Image source={{ uri: p.uri }} style={s.photo} resizeMode="cover" />
                  <TouchableOpacity
                    style={s.removeBtn}
                    onPress={() => handleRemovePhoto(p.uri)}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={13} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* AI extract button */}
          {photos.length > 0 && (
            <TouchableOpacity
              style={[s.extractBtn, extracting && s.extractBtnLoading]}
              onPress={handleExtract}
              activeOpacity={0.85}
              disabled={extracting}
            >
              {extracting ? (
                <View style={s.extractingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={s.extractBtnText}>
                    {batchProgress.total > 0
                      ? `Reading batch ${batchProgress.done + 1} of ${batchProgress.total}…`
                      : 'Preparing…'}
                  </Text>
                </View>
              ) : (
                <View style={s.extractingRow}>
                  <Ionicons name="sparkles" size={18} color="#fff" />
                  <Text style={s.extractBtnText}>Extract Sales with AI</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {photos.length > 0 && !apiKey && (
            <View style={s.noKeyBanner}>
              <Ionicons name="warning-outline" size={14} color={T.warning} />
              <Text style={s.noKeyText}>
                No Gemini key connected. Go to the AI tab to add one, then come back.
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── REVIEW STEP ── */}
      {step === 'review' && (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.reviewHint}>
            The AI extracted these sales from your photos. Toggle off any that look wrong, edit fields as needed, then tap Save.
          </Text>

          {reviewed.map((r) => (
            <View key={r._key} style={[s.reviewCard, !r._keep && s.reviewCardDim]}>
              {/* Toggle */}
              <TouchableOpacity
                style={[s.toggle, r._keep && s.toggleOn]}
                onPress={() => toggleKeep(r._key)}
              >
                {r._keep && <Ionicons name="checkmark" size={14} color="#fff" />}
              </TouchableOpacity>

              <View style={s.reviewFields}>
                <View style={s.reviewRow}>
                  <Text style={s.reviewLabel}>ITEM</Text>
                  <TextInput
                    style={s.reviewInput}
                    value={r.item}
                    onChangeText={(v) => updateField(r._key, 'item', v)}
                    placeholderTextColor={T.faint}
                    editable={r._keep}
                  />
                </View>
                <View style={s.reviewRow}>
                  <Text style={s.reviewLabel}>₦ AMOUNT</Text>
                  <TextInput
                    style={s.reviewInput}
                    value={r.total ? String(r.total) : ''}
                    onChangeText={(v) => updateField(r._key, 'total', v)}
                    keyboardType="numeric"
                    placeholderTextColor={T.faint}
                    placeholder="0"
                    editable={r._keep}
                  />
                </View>
                <View style={s.reviewRowHalf}>
                  <View style={[s.reviewRow, { flex: 1 }]}>
                    <Text style={s.reviewLabel}>DATE</Text>
                    <TextInput
                      style={s.reviewInput}
                      value={r.date || ''}
                      onChangeText={(v) => updateField(r._key, 'date', v)}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={T.faint}
                      editable={r._keep}
                    />
                  </View>
                  <View style={[s.reviewRow, { flex: 1 }]}>
                    <Text style={s.reviewLabel}>CUSTOMER</Text>
                    <TextInput
                      style={s.reviewInput}
                      value={r.customer || ''}
                      onChangeText={(v) => updateField(r._key, 'customer', v)}
                      placeholder="Optional"
                      placeholderTextColor={T.faint}
                      editable={r._keep}
                    />
                  </View>
                </View>
              </View>
            </View>
          ))}

          {/* Save footer */}
          <TouchableOpacity
            style={[s.saveBtn, keptCount === 0 && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={keptCount === 0}
            activeOpacity={0.85}
          >
            <Text style={s.saveBtnText}>
              Save {keptCount} Sale{keptCount !== 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const PHOTO_SIZE = 100

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.dark,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerSide: { width: 70 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2, fontFamily: FONT.mono },
  cancelBtn: { fontSize: 15, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  doneBtn: { fontSize: 15, color: T.accentMid, fontWeight: '700', textAlign: 'right' },

  scroll: { padding: 18, gap: 14 },

  // Select step
  addBox: {
    backgroundColor: T.surface,
    borderWidth: 2,
    borderColor: T.accent,
    borderStyle: 'dashed',
    borderRadius: 18,
    paddingVertical: 36,
    alignItems: 'center',
    gap: 10,
  },
  addBoxLoading: { borderStyle: 'solid', borderColor: T.border },
  addBoxTitle: { fontSize: 16, fontWeight: '700', color: T.dark },
  addBoxSub: { fontSize: 12, color: T.muted, textAlign: 'center', paddingHorizontal: 24 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoWrap: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 10, overflow: 'visible' },
  photo: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 10, backgroundColor: T.border },
  removeBtn: {
    position: 'absolute',
    top: -7,
    right: -7,
    width: 22,
    height: 22,
    backgroundColor: T.error,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  extractBtn: {
    backgroundColor: T.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: T.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  extractBtnLoading: { backgroundColor: T.accentDark },
  extractingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  extractBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  noKeyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: T.warningLight,
    borderRadius: 10,
    padding: 12,
  },
  noKeyText: { flex: 1, fontSize: 12, color: T.warning, lineHeight: 17 },

  // Review step
  reviewHint: {
    fontSize: 13,
    color: T.muted,
    lineHeight: 19,
    backgroundColor: T.accentLight,
    borderRadius: 12,
    padding: 12,
  },
  reviewCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: T.border,
  },
  reviewCardDim: { opacity: 0.45 },
  toggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  toggleOn: { backgroundColor: T.accent, borderColor: T.accent },
  reviewFields: { flex: 1, gap: 8 },
  reviewRow: { gap: 3 },
  reviewRowHalf: { flexDirection: 'row', gap: 12 },
  reviewLabel: { fontSize: 9, color: T.faint, fontFamily: FONT.mono, letterSpacing: 1 },
  reviewInput: {
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    paddingVertical: 4,
    fontSize: 14,
    color: T.text,
    fontWeight: '500',
  },

  saveBtn: {
    backgroundColor: T.accent,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
