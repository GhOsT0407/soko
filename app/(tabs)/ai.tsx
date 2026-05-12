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

const QUICK_PROMPTS = [
  'How am I doing this month?',
  'Who are my top customers?',
  'Which items sell the most?',
  'How much is owed to me?',
]

function buildSystemPrompt(store: ReturnType<typeof useStore.getState>) {
  const { profile, sales, debts } = store
  const now = new Date()
  const thisMonth = sales.filter((s) => {
    const d = new Date(s.createdAt)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const monthRevenue = thisMonth.reduce((sum, s) => sum + s.total, 0)
  const outstanding = debts.filter((d) => !d.paid)
  const totalOwed = outstanding.reduce((sum, d) => sum + d.amount, 0)

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

  return `You are a smart financial assistant for a Nigerian small business called "${profile.businessName || 'this business'}", owned by ${profile.ownerName || 'the owner'}.

Current business data (as of ${now.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}):
- Total recorded sales: ${sales.length} transactions
- This month's revenue: ₦${monthRevenue.toLocaleString()} (${thisMonth.length} sales)
- All-time revenue: ₦${sales.reduce((s, x) => s + x.total, 0).toLocaleString()}
- Outstanding debts: ${outstanding.length} customers owe ₦${totalOwed.toLocaleString()}
- Top selling items: ${topItems.length ? topItems.join(', ') : 'none yet'}
- Business type: ${profile.businessType || 'not specified'}

Your job:
- Answer questions about the business finances clearly and concisely
- Give practical advice relevant to small Nigerian traders and shop owners
- Use ₦ for amounts. Keep responses short (2-4 sentences max unless a list is clearly needed)
- Be encouraging and friendly — the owner is working hard
- If data is limited, say so honestly and suggest how to improve tracking`
}

export default function AIScreen() {
  const apiKey = useStore((s) => s.apiKey)
  const setApiKey = useStore((s) => s.setApiKey)
  const storeState = useStore.getState

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [keyEntry, setKeyEntry] = useState('')
  const scrollRef = useRef<ScrollView>(null)

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return
      const userMsg: ChatMessage = { role: 'user', content: text.trim() }
      const next = [...messages, userMsg]
      setMessages(next)
      setInput('')
      setLoading(true)
      scrollRef.current?.scrollToEnd({ animated: true })
      try {
        const reply = await chatWithAI(apiKey, next, buildSystemPrompt(storeState()))
        setMessages([...next, { role: 'assistant', content: reply }])
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Could not reach AI. Check your API key.')
      } finally {
        setLoading(false)
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
      }
    },
    [messages, loading, apiKey, storeState]
  )

  // API key setup screen
  if (!apiKey) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <Ionicons name="sparkles" size={20} color={T.accentMid} />
          <Text style={s.headerTitle}>Gemini Assistant</Text>
        </View>
        <View style={s.setupWrap}>
          <View style={s.setupCard}>
            <Text style={s.setupIcon}>🤖</Text>
            <Text style={s.setupTitle}>Connect Gemini AI</Text>
            <Text style={s.setupSub}>
              Enter your Google Gemini API key to unlock AI-powered financial insights and photo-to-sales extraction. Free at aistudio.google.com
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
              onPress={() => {
                if (keyEntry.trim()) setApiKey(keyEntry.trim())
              }}
              disabled={!keyEntry.trim()}
            >
              <Text style={s.setupBtnText}>Connect</Text>
            </TouchableOpacity>
            <Text style={s.setupHint}>
              Get your free key at aistudio.google.com · stored only on this device, never shared
            </Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Ionicons name="sparkles" size={20} color={T.accentMid} />
        <Text style={s.headerTitle}>Gemini Assistant</Text>
        <TouchableOpacity
          style={s.resetKey}
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
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={s.chat}
          contentContainerStyle={s.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Welcome */}
          {messages.length === 0 && (
            <View style={s.welcome}>
              <View style={s.welcomeIcon}>
                <Ionicons name="sparkles" size={28} color={T.accent} />
              </View>
              <Text style={s.welcomeTitle}>Hey! I'm your business AI</Text>
              <Text style={s.welcomeSub}>
                Ask me anything about your sales, debts, or how your business is performing.
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

          {/* Messages */}
          {messages.map((m, i) => (
            <View key={i} style={[s.bubble, m.role === 'user' ? s.bubbleUser : s.bubbleAI]}>
              {m.role === 'assistant' && (
                <View style={s.aiBadge}>
                  <Ionicons name="sparkles" size={10} color={T.accent} />
                </View>
              )}
              <Text style={[s.bubbleText, m.role === 'user' ? s.bubbleTextUser : s.bubbleTextAI]}>
                {m.content}
              </Text>
            </View>
          ))}

          {loading && (
            <View style={[s.bubble, s.bubbleAI]}>
              <View style={s.aiBadge}>
                <Ionicons name="sparkles" size={10} color={T.accent} />
              </View>
              <ActivityIndicator size="small" color={T.accent} style={{ paddingHorizontal: 8 }} />
            </View>
          )}
        </ScrollView>

        {/* Input */}
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
            <Ionicons name="send" size={18} color="#fff" />
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
    backgroundColor: T.dark,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: '#fff' },
  resetKey: { padding: 4 },

  // Setup
  setupWrap: { flex: 1, justifyContent: 'center', padding: 24 },
  setupCard: {
    backgroundColor: T.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  setupIcon: { fontSize: 40 },
  setupTitle: { fontSize: 18, fontWeight: '800', color: T.text },
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
    marginTop: 4,
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
  setupHint: { fontSize: 11, color: T.faint, textAlign: 'center', lineHeight: 16 },

  // Chat
  chat: { flex: 1 },
  chatContent: { padding: 16, gap: 10, paddingBottom: 8 },

  welcome: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  welcomeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: T.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  welcomeTitle: { fontSize: 17, fontWeight: '800', color: T.text },
  welcomeSub: { fontSize: 13, color: T.muted, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },
  quickWrap: { width: '100%', gap: 8, marginTop: 8 },
  quickBtn: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  quickBtnText: { fontSize: 13, color: T.text, fontWeight: '500' },

  bubble: { maxWidth: '85%', borderRadius: 16, padding: 12 },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: T.accent, borderBottomRightRadius: 4 },
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
  aiBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: T.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  bubbleText: { fontSize: 14, lineHeight: 20, flex: 1 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextAI: { color: T.text },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    paddingBottom: 16,
    backgroundColor: T.surface,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  input: {
    flex: 1,
    backgroundColor: T.bg,
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: T.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
})
