import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { useAppointmentsStore } from '@/stores/appointments-store'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const setSession = useAuthStore((s) => s.setSession)
  const loadAppointments = useAppointmentsStore((s) => s.load)
  const unsubscribeAppointments = useAppointmentsStore((s) => s.unsubscribe)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) loadAppointments(session.user.id)
      SplashScreen.hideAsync()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) loadAppointments(session.user.id)
      else unsubscribeAppointments()
    })

    return () => { subscription.unsubscribe(); unsubscribeAppointments() }
  }, [])

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  )
}
