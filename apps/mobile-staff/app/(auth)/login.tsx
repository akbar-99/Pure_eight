import { useState, useEffect } from 'react'
import {
  View, ScrollView, StyleSheet, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native'
import { router } from 'expo-router'
import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import { supabase } from '@/lib/supabase'
import { Text } from '@/components/ui/Text'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PureEightLogo } from '@/components/ui/PureEightLogo'
import { colors, spacing } from '@/lib/theme'

const CREDENTIALS_KEY = 'pure_eight_credentials'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)

  useEffect(() => {
    checkBiometrics()
  }, [])

  async function checkBiometrics() {
    const compatible = await LocalAuthentication.hasHardwareAsync()
    const enrolled = await LocalAuthentication.isEnrolledAsync()
    if (compatible && enrolled) {
      setBiometricAvailable(true)
      attemptBiometric()
    }
  }

  async function attemptBiometric() {
    const stored = await SecureStore.getItemAsync(CREDENTIALS_KEY)
    if (!stored) return

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Pure Eight Staff',
      cancelLabel: 'Use Password',
    })

    if (result.success) {
      const { email: savedEmail, password: savedPassword } = JSON.parse(stored)
      await signIn(savedEmail, savedPassword)
    }
  }

  async function signIn(emailVal: string, passwordVal: string) {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: emailVal, password: passwordVal })
    setLoading(false)

    if (error) {
      Alert.alert('Sign in failed', error.message)
      return
    }

    await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify({ email: emailVal, password: passwordVal }))
    router.replace('/(tabs)')
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <PureEightLogo width={200} color="dark" />
          <Text variant="heading2" style={styles.title}>Staff Portal</Text>
          <Text variant="body" color="muted">Sign in to manage your outlet</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@pureeight.com"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            placeholder="••••••••"
          />

          <Button
            label="Sign In"
            onPress={() => signIn(email, password)}
            loading={loading}
            disabled={!email || !password}
            fullWidth
            size="lg"
          />

          {biometricAvailable && (
            <Button
              label="Use Face ID / Biometric"
              variant="secondary"
              onPress={attemptBiometric}
              fullWidth
              size="lg"
            />
          )}
        </View>

        <View style={styles.footer}>
          <PureEightLogo width={120} color="dark" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  header: { gap: spacing.md },
  title: { marginTop: spacing.sm },
  form: { gap: spacing.md },
  footer: { alignItems: 'center', opacity: 0.4 },
})
