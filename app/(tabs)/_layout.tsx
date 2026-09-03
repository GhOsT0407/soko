import { Tabs } from 'expo-router'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { T } from '@/constants/theme'

type IoniconName = React.ComponentProps<typeof Ionicons>['name']

function TabIcon({
  name,
  focused,
  label,
}: {
  name: IoniconName
  focused: boolean
  label: string
}) {
  if (focused) {
    return (
      <View style={s.activeTab}>
        <Ionicons name={name} size={18} color={T.accent} />
        <Text style={s.activeLabel}>{label}</Text>
      </View>
    )
  }
  return <Ionicons name={name as IoniconName} size={22} color={T.faint} />
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: s.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'receipt' : 'receipt-outline'} focused={focused} label="Sales" />
          ),
        }}
      />
      <Tabs.Screen
        name="debts"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'people' : 'people-outline'} focused={focused} label="Debts" />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'cube' : 'cube-outline'} focused={focused} label="Stock" />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'sparkles' : 'sparkles-outline'} focused={focused} label="AI" />
          ),
        }}
      />
    </Tabs>
  )
}

const s = StyleSheet.create({
  tabBar: {
    backgroundColor: T.bg,
    borderTopWidth: 1,
    borderTopColor: T.border,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  activeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: T.accentLight,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  activeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: T.accent,
  },
})
