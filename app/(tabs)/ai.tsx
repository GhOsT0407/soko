import { useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { T, FONT } from '@/constants/theme'
import { useStore } from '@/store'
import { chatWithAI, type ChatMessage } from '@/services/ai'
import { supabase } from '@/lib/supabase'

const QUICK_PROMPTS = [
  'How am I doing this month?',
  'Who are my top customers?',
  'Which items sell the most?',
  'How much is owed to me?',
]

async function buildSystemPrompt(businessId: string, businessName: string) {
  const now = new Date()

  const [salesRes, debtsRes] = await Promise.all([
    supabase.from('sales').select('item,total,is_debt,created_at').eq('business_id', businessId),
    supabase.from('debts').select('customer,amount,amount_paid,paid').eq('business_id', businessId).eq('paid', false),
  ])

  const sales = salesRes.data || []
  const debts = debtsRes.data || []

  const thisMonth = sales.filter((s) => {
    const d = new Date(s.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const monthRevenue = thisMonth.reduce((sum, s) => sum + s.total, 0)
  const totalOwed = debts.reduce((sum, d) => sum + (d.amount - d.amount_paid), 0)

  const itemCounts: Record<string, { count: number; revenue: number }> = {}
  sales.forEach((s) => {
    if (!itemCounts[s.item]) itemCounts[s.item] = { count: 0, revenue: 0 }
    itemCounts[s.item].count++
    itemCounts[s.item].revenue += s.total
  })
  const topItems = Object.entries(itemCounts)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([item, d]) => `${item} (${d.count} sales, ₦${d.revenue.toLocaleString()})`)

  return `You are a smart financial assistant for "${businessName}", a Nigerian small business.

Data as of ${now.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}:
- Total recorded sales: ${sales.length} transactions
- This month's revenue: ₦${monthRevenue.toLocaleString()} (${thisMonth.length} sales)
- All-time revenue: ₦${sales.reduce((s, x) => s + x.total, 0).toLocaleString()}
- Outstanding debts: ${debts.length} customers owe ₦${totalOwed.toLocaleString()}
- Top selling items: ${topItems.length ? topItems.join(', ') : 'none yet'}

Rules:
- Answer questions about finances clearly and concisely
- Give practical advice for Nigerian traders
- Use ₦ for amounts. Keep responses to 2–4 sentences unless a list is needed
- Be encouraging — the owner is working hard
- If data is limited, say so and suggest how to improve tracking`
}

export default function AIScreen() {
  const apiKey = useStore((s) => s.apiKey)
  const setApiKey = useStore((s) => s.setApiKey)
  const activeBusiness = useStore((s) => s.activeBusiness)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [keyEntry, setKeyEntry] = useState('')
  const scrollRef = useRef<ScrollView>(null)

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || loading || !activeBusiness) return
      const userMsg: ChatMessage = { role: 'user', content: text.trim() }
      const next = [...messages, userMsg]
      setMessages(next)
      setInput('')
      setLoading(true)
      scrollRef.current?.scrollToEnd({ animated: true })
      try {
        const systemPrompt = await buildSystemPrompt(activeBusiness.id, activeBusiness.name)
        const reply = await chatWithAI(apiKey, next, systemPrompt)
        setMessages([...next, { role: 'assistant', content: reply }])
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Could not reach AI. Check your API key.')
      } finally {
        setLoading(false)
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
      }
    },
    [messages, loading, apiKey, activeBusiness]
  )

  if (!apiKey) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <Ionicons name="sparkles" size={18} color={T.accent} />
          <Text style={s.headerTitle}>AI Assistant</Text>
        </View>
        <View style={s.setupWrap}>
          <View style={s.setupCard}>
            <Text style={s.setupIcon}>✦</Text>
            <Text style={s.setupTitle}>Connect Gemini AI</Text>
            <Text style={s.setupSub}>
              Enter your Google Gemini API key to unlock AI-powered financial insights and photo extraction.
              {'\n\n'}Free at aistudio.google.com
            </Text>
            <TextInput
              style={s.setupInput}
              placeholder="AIza..."
              placeholderTextColor={T.faint}
              value={keyEntry}
              onChangeText={setKeyEntry}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <TouchableOpacity
              style={[s.setupBtn, !keyEntry.trim() && s.setupBtnDisabled]}
              onPress={() => { if (keyEntry.trim()) setApiKey(keyEntry.trim()) }}
              disabled={!keyEntry.trim()}
            >
              <Text style={s.setupBtnText}>Connect</Text>
            </TouchableOpacity>
            <Text style={s.setupHint}>Stored only on this device · never shared</Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Ionicons name="sparkles" size={18} color={T.accent} />
        <Text style={s.headerTitle}>AI Assistant</Text>
        <TouchableOpacity
          onPress={() =>
            Alert.alert('Remove API Key', 'This will disconnect the AI assistant.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => setApiKey('') },
            ])
          }
        >
          <Ionicons name="key-outline" size={18} color={T.faint} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={s.chat}
          contentContainerStyle={s.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && (
            <View style={s.welcome}>
              <View style={s.welcomeIcon}>
                <Ionicons name="sparkles" size={24} color={T.accent} />
              </View>
              <Text style={s.welcomeTitle}>Ask me anything</Text>
              <Text style={s.welcomeSub}>
                I know your sales, debts, and inventory. Ask about your business performance.
              </Text>
              <View style={s.quickWrap}>
                {QUICK_PROMPTS.map((p) => (
                  <TouchableOpacity key={p} style={s.quickBtn} onPress={() => send(p)}>
                    <Text style={s.quickBtnText}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map((m, i) => (
            <View key={i} style={[s.bubble, m.role === 'user' ? s.bubbleUser : s.bubbleAI]}>
              {m.role === 'assistant' && (
                <Ionicons name="sparkles" size={12} color={T.accent} style={s.aiBadge} />
              )}
              <Text style={[s.bubbleText, m.role === 'user' ? s.bubbleTextUser : s.bubbleTextAI]}>
                {m.content}
              </Text>
            </View>
          ))}

          {loading && (
            <View style={[s.bubble, s.bubbleAI]}>
              <Ionicons name="sparkles" size={12} color={T.accent} style={s.aiBadge} />
              <ActivityIndicator size="small" color={T.accent} style={{ paddingHorizontal: 8 }} />
            </View>
          )}
        </ScrollView>

        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            placeholder="Ask about your business..."
            placeholderTextColor={T.faint}
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => send(input)}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDisabled]}
            onPress={() => send(input)}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="arrow-up" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: T.text },

  setupWrap: { flex: 1, justifyContent: 'center', padding: 24 },
  setupCard: {
    backgroundColor: T.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: T.border,
  },
  setupIcon: { fontSize: 36, color: T.accent },
  setupTitle: { fontSize: 20, fontWeight: '800', color: T.text },
  setupSub: { fontSize: 13, color: T.muted, textAlign: 'center', lineHeight: 20 },
  setupInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: T.text,
    backgroundColor: T.bg,
    fontFamily: FONT.mono,
  },
  setupBtn: {
    backgroundColor: T.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  setupBtnDisabled: { opacity: 0.4 },
  setupBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  setupHint: { fontSize: 11, color: T.faint, textAlign: 'center' },

  chat: { flex: 1 },
  chatContent: { padding: 16, gap: 10, paddingBottom: 8 },

  welcome: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  welcomeIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: T.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: { fontSize: 18, fontWeight: '800', color: T.text },
  welcomeSub: {
    fontSize: 13,
    color: T.muted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  quickWrap: { width: '100%', gap: 8, marginTop: 6 },
  quickBtn: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  quickBtnText: { fontSize: 13, color: T.text, fontWeight: '500' },

  bubble: { maxWidth: '85%', borderRadius: 16, padding: 12 },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: T.accent,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    alignSelf: 'flex-start',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderBottomLeftRadius: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  aiBadge: { marginTop: 2, flexShrink: 0 },
  bubbleText: { fontSize: 14, lineHeight: 20, flex: 1 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextAI: { color: T.text },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    paddingBottom: 16,
    backgroundColor: T.bg,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  input: {
    flex: 1,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: T.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
})
