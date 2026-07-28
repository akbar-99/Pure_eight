import { useState } from 'react'
import { View, ScrollView, StyleSheet, Switch, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Stack } from 'expo-router'
import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { useAuthStore } from '@/stores/auth-store'
import { colors, spacing } from '@/lib/theme'

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user)
  const [pushEnabled, setPushEnabled] = useState(true)
  const [biometricEnabled, setBiometricEnabled] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(false)

  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Account */}
          <Text variant="label" color="muted" style={styles.sectionLabel}>ACCOUNT</Text>
          <Card padded={false}>
            <View style={styles.infoRow}>
              <Text variant="bodySmall" color="muted">Name</Text>
              <Text variant="body">{user?.user_metadata?.full_name ?? '—'}</Text>
            </View>
            <View style={[styles.infoRow, styles.rowBorder]}>
              <Text variant="bodySmall" color="muted">Email</Text>
              <Text variant="body">{user?.email ?? '—'}</Text>
            </View>
            <View style={[styles.infoRow, styles.rowBorder]}>
              <Text variant="bodySmall" color="muted">Role</Text>
              <Text variant="body">{user?.user_metadata?.role ?? 'Staff'}</Text>
            </View>
          </Card>

          {/* Notifications */}
          <Text variant="label" color="muted" style={styles.sectionLabel}>NOTIFICATIONS</Text>
          <Card padded={false}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text variant="body">Push Notifications</Text>
                <Text variant="bodySmall" color="muted">Appointment reminders and alerts</Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                trackColor={{ true: colors.black, false: colors.gray200 }}
                thumbColor={colors.white}
              />
            </View>
            <View style={[styles.toggleRow, styles.rowBorder]}>
              <View style={{ flex: 1 }}>
                <Text variant="body">Sound</Text>
                <Text variant="bodySmall" color="muted">Play sound on new alerts</Text>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ true: colors.black, false: colors.gray200 }}
                thumbColor={colors.white}
              />
            </View>
          </Card>

          {/* Security */}
          <Text variant="label" color="muted" style={styles.sectionLabel}>SECURITY</Text>
          <Card padded={false}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text variant="body">Biometric Unlock</Text>
                <Text variant="bodySmall" color="muted">Use Face ID or Touch ID to open app</Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={setBiometricEnabled}
                trackColor={{ true: colors.black, false: colors.gray200 }}
                thumbColor={colors.white}
              />
            </View>
            <TouchableOpacity
              style={[styles.toggleRow, styles.rowBorder]}
              onPress={() => Alert.alert('Change Password', 'A password reset link will be sent to your email.')}
              activeOpacity={0.7}
            >
              <Text variant="body" style={{ flex: 1 }}>Change Password</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
            </TouchableOpacity>
          </Card>

          {/* App info */}
          <Text variant="label" color="muted" style={[styles.sectionLabel, { textAlign: 'center', marginTop: spacing.xl }]}>
            PURE EIGHT STAFF v1.0
          </Text>
        </ScrollView>
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  content: { padding: spacing.lg, gap: spacing.sm },
  sectionLabel: { marginTop: spacing.md },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, minHeight: 56,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.gray100 },
})
