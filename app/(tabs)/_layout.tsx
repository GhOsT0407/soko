import { Tabs } from 'expo-router'
import { View, Text, StyleSheet, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { T } from '@/constants/theme'

type IoniconName = React.ComponentProps<typeof Ionicons>['name']

function TabIcon({
  focused,
  icon,
  iconActive,
  label,
}: {
  focused: boolean
  icon: IoniconName
  iconActive: IoniconName
  label: string
}) {
  return (
    <View style={[ti.wrap, focused && ti.wrapActive]}>
      <Ionicons
        name={focused ? iconActive : icon}
        size={22}
        color={focused ? '#fff' : 'rgba(255,255,255,0.4)'}
      />
      <Text style={[ti.label, focused && ti.labelActive]}>{label}</Text>
    </View>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: ti.bar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="home-outline" iconActive="home" label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="cash-outline" iconActive="cash" label="Sales" />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="cube-outline" iconActive="cube" label="Stock" />
          ),
        }}
      />
      <Tabs.Screen
        name="debts"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="people-outline" iconActive="people" label="Debts" />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="sparkles-outline" iconActive="sparkles" label="AI" />
          ),
        }}
      />
    </Tabs>
  )
}

const ti = StyleSheet.create({
  bar: {
    backgroundColor: T.dark,
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 80 : 68,
    paddingBottom: Platform.OS === 'ios' ? 20 : 6,
    paddingTop: 6,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
    minWidth: 56,
  },
  wrapActive: {
    backgroundColor: T.accent,
  },
  label: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  labelActive: {
    color: '#fff',
    fontWeight: '700',
  },
})
