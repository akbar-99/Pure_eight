import { Tabs } from 'expo-router'
import { Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/lib/theme'

type IconName = keyof typeof Ionicons.glyphMap

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <Ionicons
      name={focused ? name : (`${name}-outline` as IconName)}
      size={24}
      color={focused ? colors.black : colors.gray400}
    />
  )
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.gray400,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.gray100,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Discover', tabBarIcon: ({ focused }) => <TabIcon name="compass" focused={focused} /> }}
      />
      <Tabs.Screen
        name="bookings"
        options={{ title: 'Bookings', tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} /> }}
      />
      <Tabs.Screen
        name="loyalty"
        options={{ title: 'Loyalty', tabBarIcon: ({ focused }) => <TabIcon name="star" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} /> }}
      />
    </Tabs>
  )
}
