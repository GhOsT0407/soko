import { useState, useCallback } from 'react'
import { View, StyleSheet, ScrollView, Pressable, RefreshControl, Alert } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { T, SP } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { naira } from '@/lib/format'
import { useStore } from '@/store'
import type { InventoryItem } from '@/types'
import {
  Screen, Card, IconButton, Badge, Input, ListRow, EmptyState, ScreenHeader, StatTile,
} from '@/components'

const CACHE_TTL = 30_000

export default function InventoryScreen() {
  const activeBusiness = useStore((s) => s.activeBusiness)
  const setInventoryCache = useStore((s) => s.setInventoryCache)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!activeBusiness) return
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .eq('business_id', activeBusiness.id)
      .order('name')
    if (data) {
      setItems(data)
      setInventoryCache({ data, at: Date.now() })
    }
  }, [activeBusiness, setInventoryCache])

  useFocusEffect(useCallback(() => {
    const cache = useStore.getState().inventoryCache
    if (cache && Date.now() - cache.at < CACHE_TTL) {
      setItems(cache.data)
      return
    }
    load()
  }, [load]))

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const filtered = items.filter(
    (i) => query.length === 0 || i.name.toLowerCase().includes(query.toLowerCase())
  )

  const lowStock = items.filter((i) => i.qty <= i.low_stock_threshold)

  async function handleDelete(id: string) {
    Alert.alert('Delete item?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('inventory').delete().eq('id', id)
          setItems((prev) => prev.filter((i) => i.id !== id))
        },
      },
    ])
  }

  return (
    <Screen>
      <ScreenHeader
        title="Stock"
        right={<IconButton icon="add" variant="primary" onPress={() => router.push('/inventory/new')} accessibilityLabel="Add stock item" />}
      />

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />}
      >
        <View style={s.kpis}>
          <StatTile
            label="Items tracked"
            value={String(items.length)}
            meta={items.length === 0 ? 'Add your first product' : 'On the shelf'}
            tone={items.length === 0 ? 'neutral' : 'good'}
          />
          <StatTile
            label="Low stock"
            value={String(lowStock.length)}
            valueColor={lowStock.length > 0 ? T.error : undefined}
            meta={lowStock.length > 0 ? 'Restock soon' : 'All stocked up'}
            tone={lowStock.length > 0 ? 'bad' : 'good'}
          />
        </View>

        <Input
          icon="search-outline"
          placeholder="Search items"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
        />

        {filtered.length === 0 ? (
          <Card padded={false}>
            <EmptyState
              icon="cube-outline"
              title={query ? 'No items match' : 'No stock yet'}
              body={query ? 'Try a different name.' : 'Add your products to get low-stock warnings before you run out.'}
              action={query ? undefined : 'Add stock item'}
              onAction={() => router.push('/inventory/new')}
            />
          </Card>
        ) : (
          <Card padded={false}>
            {filtered.map((item, idx) => {
              const isLow = item.qty <= item.low_stock_threshold
              return (
                <ListRow
                  key={item.id}
                  title={item.name}
                  meta={[item.category, item.sell_price ? naira(item.sell_price) : null].filter(Boolean).join(' · ')}
                  trailing={
                    <View style={s.trail}>
                      <Badge label={`${item.qty} ${item.unit}`} tone={isLow ? 'bad' : 'good'} mono />
                      <Pressable onPress={() => handleDelete(item.id)} hitSlop={10} accessibilityLabel="Delete item" accessibilityRole="button">
                        <Ionicons name="trash-outline" size={16} color={T.faint} />
                      </Pressable>
                    </View>
                  }
                  onPress={() => router.push(`/inventory/${item.id}` as any)}
                  last={idx === filtered.length - 1}
                />
              )
            })}
          </Card>
        )}
      </ScrollView>
    </Screen>
  )
}

const s = StyleSheet.create({
  content: { paddingHorizontal: SP.xl, gap: SP.md, paddingBottom: SP.xxl },
  kpis: { flexDirection: 'row', gap: SP.sm },
  trail: { flexDirection: 'row', alignItems: 'center', gap: SP.md },
})
