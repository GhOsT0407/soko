import { Tabs } from 'expo-router'
import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { T, FONT } from '@/constants/theme'

type IoniconName = React.ComponentProps<typeof Ionicons>['name']

// The focused tab's icon sits in a teal-washed pill; the label stays visible
// on every tab so the five destinations never need to be guessed from an icon.
function TabIcon({ name, focused }: { name: IoniconName; focused: boolean }) {
  return (
    <View style={[s.pill, focused && s.pillOn]}>
      <Ionicons name={name} size={21} color={focused ? T.accentDark : T.muted} />
    </View>
  )
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: s.tabBar,
        tabBarShowLabel: true,
        tabBarActiveTintColor: T.accentDark,
        tabBarInactiveTintColor: T.muted,
        tabBarLabelStyle: s.label,
        tabBarItemStyle: s.item,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Sales',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'receipt' : 'receipt-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="debts"
        options={{
          title: 'Debts',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'people' : 'people-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Stock',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'cube' : 'cube-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'Assistant',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'sparkles' : 'sparkles-outline'} focused={focused} />,
        }}
      />
    </Tabs>
  )
}

const s = StyleSheet.create({
  tabBar: {
    backgroundColor: T.surface,
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingTop: 6,
    elevation: 0,
    shadowOpacity: 0,
  },
  item: { paddingVertical: 2 },
  label: { fontFamily: FONT.sansSemi, fontSize: 10, marginTop: 2 },
  pill: {
    width: 46,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillOn: { backgroundColor: T.accentLight },
})
