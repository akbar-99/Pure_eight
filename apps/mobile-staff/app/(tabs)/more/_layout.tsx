import { Stack } from 'expo-router'
import { colors } from '@/lib/theme'

export default function MoreLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.black,
        headerShadowVisible: false,
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: colors.gray50 },
      }}
    />
  )
}
