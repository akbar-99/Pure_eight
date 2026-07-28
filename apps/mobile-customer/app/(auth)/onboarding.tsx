import { useState } from 'react'
import {
  View, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { PureEightLogo } from '@/components/ui/PureEightLogo'
import { colors, spacing, radius } from '@/lib/theme'

function T({ children, style, variant, color }: any) {
  const base = { color: color === 'muted' ? colors.gray500 : colors.black }
  const v = variant === 'heading1' ? { fontSize: 32, fontWeight: '700' }
    : variant === 'heading3' ? { fontSize: 18, fontWeight: '600' }
    : variant === 'label' ? { fontSize: 12, fontWeight: '500', letterSpacing: 0.5, textTransform: 'uppercase' }
    : { fontSize: 15 }
  const { Text } = require('react-native')
  return <Text style={[base, v, style]}>{children}</Text>
}

type Step = 'phone' | 'otp'

export default function OnboardingScreen() {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendOTP() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ phone: `+91${phone}` })
    setLoading(false)
    if (error) { Alert.alert('Error', error.message); return }
    setStep('otp')
  }

  async function verifyOTP() {
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({ phone: `+91${phone}`, token: otp, type: 'sms' })
    setLoading(false)
    if (error) { Alert.alert('Invalid code', error.message); return }
    router.replace('/(tabs)')
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          {/* Brand */}
          <View style={styles.brand}>
            <PureEightLogo width={190} color="dark" />
            <T variant="heading1" style={{ marginTop: spacing.lg }}>
              {step === 'phone' ? 'Welcome' : 'Enter code'}
            </T>
            <T color="muted" style={{ marginTop: spacing.sm }}>
              {step === 'phone'
                ? 'Enter your mobile number to get started'
                : `We sent a 6-digit code to +91 ${phone}`}
            </T>
          </View>

          {/* Input */}
          <View style={styles.inputGroup}>
            {step === 'phone' ? (
              <View style={styles.phoneRow}>
                <View style={styles.countryCode}><T>+91</T></View>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="98765 43210"
                  placeholderTextColor={colors.gray400}
                  maxLength={10}
                />
              </View>
            ) : (
              <TextInput
                style={[styles.input, styles.otpInput]}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                placeholder="000000"
                placeholderTextColor={colors.gray400}
                maxLength={6}
                textAlign="center"
                autoFocus
              />
            )}

            <TouchableOpacity
              style={[styles.cta, (!phone && !otp) && styles.ctaDisabled]}
              onPress={step === 'phone' ? sendOTP : verifyOTP}
              disabled={loading || (step === 'phone' ? phone.length < 10 : otp.length < 6)}
              activeOpacity={0.8}
            >
              <T style={{ color: colors.white, fontWeight: '600' }}>
                {loading ? 'Please wait…' : step === 'phone' ? 'Send Code' : 'Verify'}
              </T>
            </TouchableOpacity>

            {step === 'otp' && (
              <TouchableOpacity onPress={() => setStep('phone')} style={{ alignSelf: 'center' }}>
                <T color="muted">Change number</T>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  content: { flex: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.xxl },
  brand: { gap: spacing.xs },
  inputGroup: { gap: spacing.md },
  phoneRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  countryCode: {
    height: 52, paddingHorizontal: spacing.md,
    borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gray50,
  },
  input: {
    flex: 1, height: 52, borderWidth: 1, borderColor: colors.gray200,
    borderRadius: radius.sm, paddingHorizontal: spacing.md,
    fontSize: 17, color: colors.black, backgroundColor: colors.white,
  },
  otpInput: { fontSize: 24, fontWeight: '600', flex: undefined, width: '100%', letterSpacing: 8 },
  cta: {
    height: 52, backgroundColor: colors.black, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.4 },
})
