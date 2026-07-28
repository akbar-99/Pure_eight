import { useState } from 'react'
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Stack } from 'expo-router'
import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth-store'
import { colors, spacing, radius } from '@/lib/theme'

type ClockState = 'out' | 'in'

export default function AttendanceScreen() {
  const user = useAuthStore((s) => s.user)
  const [clockState, setClockState] = useState<ClockState>('out')
  const [clockInTime, setClockInTime] = useState<string | null>(null)

  function handleClockIn() {
    Alert.alert(
      'Clock In',
      'Confirm your attendance at this location?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clock In',
          onPress: () => {
            const now = new Date()
            setClockInTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
            setClockState('in')
          },
        },
      ]
    )
  }

  function handleClockOut() {
    Alert.alert(
      'Clock Out',
      'End your shift now?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clock Out',
          style: 'destructive',
          onPress: () => {
            setClockState('out')
            setClockInTime(null)
          },
        },
      ]
    )
  }

  const isIn = clockState === 'in'

  return (
    <>
      <Stack.Screen options={{ title: 'Attendance' }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Status card */}
          <Card style={styles.statusCard}>
            <View style={[styles.statusDot, { backgroundColor: isIn ? colors.black : colors.gray300 }]} />
            <Text variant="heading2" style={{ marginTop: spacing.md }}>
              {isIn ? 'You are clocked in' : 'You are clocked out'}
            </Text>
            {clockInTime && (
              <Text variant="body" color="muted" style={{ marginTop: spacing.xs }}>
                Clocked in at {clockInTime}
              </Text>
            )}
            <Text variant="bodySmall" color="muted" style={{ marginTop: spacing.xs }}>
              {user?.user_metadata?.full_name ?? 'Staff Member'}
            </Text>
          </Card>

          {/* Action */}
          {isIn ? (
            <Button label="Clock Out" variant="secondary" size="lg" fullWidth onPress={handleClockOut} />
          ) : (
            <Button label="Clock In" size="lg" fullWidth onPress={handleClockIn} />
          )}

          {/* Today's log */}
          <Text variant="label" color="muted" style={styles.sectionLabel}>TODAY'S LOG</Text>
          <Card>
            <View style={styles.logRow}>
              <Ionicons name="log-in-outline" size={18} color={colors.gray500} />
              <Text variant="body" color="muted" style={{ flex: 1 }}>Clock In</Text>
              <Text variant="body">{clockInTime ?? '—'}</Text>
            </View>
            <View style={[styles.logRow, { borderTopWidth: 1, borderTopColor: colors.gray100, marginTop: spacing.sm, paddingTop: spacing.sm }]}>
              <Ionicons name="log-out-outline" size={18} color={colors.gray500} />
              <Text variant="body" color="muted" style={{ flex: 1 }}>Clock Out</Text>
              <Text variant="body">—</Text>
            </View>
          </Card>

          {/* Geo-fence note */}
          <View style={styles.note}>
            <Ionicons name="location-outline" size={16} color={colors.gray400} />
            <Text variant="bodySmall" color="muted" style={{ flex: 1 }}>
              Location is used to verify you are at the outlet when clocking in.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  content: { padding: spacing.lg, gap: spacing.lg },
  statusCard: { alignItems: 'center', paddingVertical: spacing.xl },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  sectionLabel: {},
  logRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  note: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    paddingHorizontal: spacing.sm,
  },
})
