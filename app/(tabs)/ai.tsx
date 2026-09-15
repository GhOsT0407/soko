import { useState, useRef, useCallback } from 'react'
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { T, FONT, R, SP } from '@/constants/theme'
import { useStore } from '@/store'
import { chatWithAI, type ChatMessage } from '@/services/ai'
import { supabase } from '@/lib/supabase'
import { Screen, Txt, Card, Button, IconButton, Input, ScreenHeader } from '@/components'

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
      <Screen>
        <ScreenHeader title="Assistant" subtitle="Ask about your sales, debts and stock" />
        <View style={s.setupWrap}>
          <Card style={s.setupCard}>
            <View style={s.disc}>
              <Ionicons name="sparkles" size={24} color={T.accent} />
            </View>
            <Txt variant="title" align="center" style={s.centered}>Connect Gemini</Txt>
            <Txt variant="meta" align="center" style={[s.centered, s.setupBody]}>
              Paste a Google Gemini API key to unlock the assistant and photo import. It's free at aistudio.google.com.
            </Txt>
            <Input
              mono
              placeholder="AIza…"
              value={keyEntry}
              onChangeText={setKeyEntry}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              containerStyle={s.setupInput}
            />
            <Button
              label="Connect"
              size="lg"
              disabled={!keyEntry.trim()}
              onPress={() => { if (keyEntry.trim()) setApiKey(keyEntry.trim()) }}
              style={s.setupBtn}
            />
            <Txt variant="meta" align="center">Stored only on this phone · never sent to Soko</Txt>
          </Card>
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      <ScreenHeader
        title="Assistant"
        subtitle={activeBusiness ? `Knows ${activeBusiness.name}'s books` : undefined}
        right={
          <IconButton
            icon="key-outline"
            accessibilityLabel="Remove API key"
            onPress={() =>
              Alert.alert('Remove API key?', 'This disconnects the assistant until you add a key again.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => setApiKey('') },
              ])
            }
          />
        }
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={s.chat}
          contentContainerStyle={s.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && (
            <View style={s.welcome}>
              <View style={s.disc}>
                <Ionicons name="sparkles" size={24} color={T.accent} />
              </View>
              <Txt variant="heading" align="center" style={s.centered}>Ask me anything</Txt>
              <Txt variant="meta" align="center" style={[s.centered, s.welcomeBody]}>
                I can read your sales, debts and stock. Try one of these:
              </Txt>
              <View style={s.quickWrap}>
                {QUICK_PROMPTS.map((p) => (
                  <Card key={p} onPress={() => send(p)} style={s.quick}>
                    <Txt variant="bodyStrong" style={s.quickText}>{p}</Txt>
                    <Ionicons name="arrow-forward" size={16} color={T.accent} />
                  </Card>
                ))}
              </View>
            </View>
          )}

          {messages.map((m, i) =>
            m.role === 'user' ? (
              <View key={i} style={[s.bubble, s.bubbleUser]}>
                <Txt style={s.userText}>{m.content}</Txt>
              </View>
            ) : (
              <View key={i} style={[s.bubble, s.bubbleAI]}>
                <Ionicons name="sparkles" size={13} color={T.accent} style={s.aiMark} />
                <Txt style={s.aiText}>{m.content}</Txt>
              </View>
            )
          )}

          {loading && (
            <View style={[s.bubble, s.bubbleAI]}>
              <Ionicons name="sparkles" size={13} color={T.accent} style={s.aiMark} />
              <ActivityIndicator size="small" color={T.accent} style={{ paddingHorizontal: 8 }} />
            </View>
          )}
        </ScrollView>

        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            placeholder="Ask about your business…"
            placeholderTextColor={T.faint}
            selectionColor={T.accent}
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => send(input)}
          />
          <IconButton
            icon="arrow-up"
            variant="primary"
            size={42}
            onPress={() => send(input)}
            disabled={!input.trim() || loading}
            accessibilityLabel="Send"
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const s = StyleSheet.create({
  // Centered text stretches to the column and centres itself — a text node
  // sized to its own content can clip on Android when the custom face
  // measures narrower than it paints.
  centered: { alignSelf: 'stretch' },
  disc: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: T.accentLight,
    alignItems: 'center', justifyContent: 'center',
  },

  setupWrap: { flex: 1, justifyContent: 'center', padding: SP.xl },
  setupCard: { alignItems: 'center', gap: SP.md, padding: SP.xxl },
  setupBody: { lineHeight: 18, paddingHorizontal: SP.md },
  setupInput: { alignSelf: 'stretch', marginTop: SP.xs },
  setupBtn: { alignSelf: 'stretch' },

  chat: { flex: 1 },
  chatContent: { paddingHorizontal: SP.xl, paddingBottom: SP.sm, gap: SP.sm },

  welcome: { alignItems: 'center', paddingVertical: SP.xl, gap: SP.sm },
  welcomeBody: { paddingHorizontal: SP.xl },
  quickWrap: { alignSelf: 'stretch', gap: SP.sm, marginTop: SP.sm },
  quick: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingVertical: 13, paddingHorizontal: 14 },
  quickText: { flex: 1 },

  bubble: { maxWidth: '86%', borderRadius: R.xl, paddingVertical: 10, paddingHorizontal: 14 },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: T.accent, borderBottomRightRadius: 6 },
  bubbleAI: {
    alignSelf: 'flex-start',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderBottomLeftRadius: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SP.sm,
  },
  aiMark: { marginTop: 3 },
  userText: { color: T.white, flexShrink: 1 },
  aiText: { flex: 1 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SP.sm,
    paddingHorizontal: SP.md,
    paddingTop: SP.sm,
    paddingBottom: SP.md,
    backgroundColor: T.surface,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  input: {
    flex: 1,
    fontFamily: FONT.sans,
    fontSize: 14,
    color: T.text,
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: T.borderStrong,
    borderRadius: R.xl,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 11,
    maxHeight: 110,
  },
})
