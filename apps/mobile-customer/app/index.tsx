import { Redirect } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useAuthStore } from '@/stores/auth-store'
import { colors } from '@/lib/theme'

export default function Index() {
  const { session, loading } = useAuthStore()
  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }}>
      <ActivityIndicator color={colors.black} />
    </View>
  )
  return <Redirect href={session ? '/(tabs)' : '/(auth)/onboarding'} />
}
