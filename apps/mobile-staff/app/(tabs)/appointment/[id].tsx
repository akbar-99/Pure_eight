import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, Stack, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAppointmentsStore, type AppointmentStatus } from '@/stores/appointments-store'
import { colors, spacing, radius } from '@/lib/theme'

// ── Status flow ──────────────────────────────────────────────
const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending:    'Pending',
  confirmed:  'Confirmed',
  checked_in: 'Checked In',
  in_service: 'In Service',
  completed:  'Completed',
  no_show:    'No Show',
  cancelled:  'Cancelled',
}

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  pending:    colors.gray400,
  confirmed:  colors.gray700,
  checked_in: colors.gold,
  in_service: colors.black,
  completed:  colors.gray500,
  no_show:    colors.gray400,
  cancelled:  colors.gray300,
}

type Action = { label: string; next: AppointmentStatus; variant?: 'primary' | 'secondary' | 'destructive' }

const NEXT_ACTIONS: Partial<Record<AppointmentStatus, Action[]>> = {
  pending:    [{ label: 'Confirm Appointment', next: 'confirmed', variant: 'primary' },
               { label: 'Mark No Show', next: 'no_show', variant: 'destructive' },
               { label: 'Cancel', next: 'cancelled', variant: 'destructive' }],
  confirmed:  [{ label: 'Customer Checked In', next: 'checked_in', variant: 'primary' },
               { label: 'Mark No Show', next: 'no_show', variant: 'destructive' },
               { label: 'Cancel', next: 'cancelled', variant: 'destructive' }],
  checked_in: [{ label: 'Start Service', next: 'in_service', variant: 'primary' }],
  in_service: [{ label: 'Complete & Bill', next: 'completed', variant: 'primary' }],
}

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { appointments, updateStatus } = useAppointmentsStore()

  const appt = appointments.find((a) => a.id === id)

  if (!appt) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: 'Appointment' }} />
        <View style={styles.notFound}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.gray300} />
          <Text variant="body" color="muted" style={{ marginTop: spacing.md }}>Appointment not found</Text>
          <Button label="Go Back" variant="secondary" onPress={() => router.back()} style={{ marginTop: spacing.lg }} />
        </View>
      </SafeAreaView>
    )
  }

  const actions = NEXT_ACTIONS[appt.status] ?? []
  const totalPrice = appt.items.reduce((s, i) => s + i.price, 0)
  const totalDuration = appt.items.reduce((s, i) => s + i.durationMins, 0)
  const statusColor = STATUS_COLOR[appt.status] ?? colors.gray400

  // Captured after the `!appt` guard above — TS drops the narrowing inside closures.
  const apptId = appt.id

  async function handleAction(action: Action) {
    if (action.variant === 'destructive') {
      Alert.alert(action.label, 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: action.label, style: 'destructive', onPress: () => updateStatus(apptId, action.next) },
      ])
    } else {
      await updateStatus(apptId, action.next)
      if (action.next === 'completed') {
        Alert.alert('Service Complete', 'The appointment is marked complete. Proceed to billing.', [
          { text: 'OK' }
        ])
      }
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: appt.customer?.fullName ?? 'Walk-in',
          headerRight: () => (
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text variant="label" style={{ color: colors.white, fontSize: 9 }}>
                {STATUS_LABEL[appt.status]}
              </Text>
            </View>
          ),
        }}
      />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>

          {/* Time block */}
          <Card style={styles.timeCard}>
            <View style={[styles.timeAccent, { backgroundColor: statusColor }]} />
            <View style={{ flex: 1 }}>
              <Text variant="heading2">{format(new Date(appt.startsAt), 'h:mm a')}</Text>
              <Text variant="body" color="muted">
                {format(new Date(appt.startsAt), 'EEEE, d MMMM')} · {totalDuration} min
              </Text>
              <Text variant="bodySmall" color="muted" style={{ marginTop: 2 }}>
                Ends at {format(new Date(appt.endsAt), 'h:mm a')}
              </Text>
            </View>
          </Card>

          {/* Customer */}
          <View>
            <Text variant="label" color="muted" style={styles.sectionLabel}>CUSTOMER</Text>
            <Card>
              <View style={styles.customerRow}>
                <View style={styles.customerAvatar}>
                  <Text variant="heading3" color="inverse">
                    {appt.customer?.fullName?.[0] ?? '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="body">{appt.customer?.fullName ?? 'Walk-in Customer'}</Text>
                  <Text variant="bodySmall" color="muted">{appt.customer?.mobile ?? '—'}</Text>
                </View>
                {appt.customer && (
                  <View style={styles.contactBtns}>
                    <TouchableOpacity style={styles.iconBtn}>
                      <Ionicons name="call-outline" size={18} color={colors.black} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn}>
                      <Ionicons name="chatbubble-outline" size={18} color={colors.black} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </Card>
          </View>

          {/* Services */}
          <View>
            <Text variant="label" color="muted" style={styles.sectionLabel}>SERVICES</Text>
            <Card padded={false}>
              {appt.items.map((item, idx) => (
                <View
                  key={item.id}
                  style={[styles.serviceRow, idx < appt.items.length - 1 && styles.serviceBorder]}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="body">{item.serviceName}</Text>
                    <Text variant="bodySmall" color="muted">{item.durationMins} min</Text>
                  </View>
                  <Text variant="body">₹{item.price.toLocaleString()}</Text>
                </View>
              ))}
              <View style={[styles.serviceRow, styles.serviceBorder, styles.totalRow]}>
                <Text variant="heading3" style={{ flex: 1 }}>Total</Text>
                <Text variant="heading3">₹{totalPrice.toLocaleString()}</Text>
              </View>
            </Card>
          </View>

          {/* Notes */}
          {appt.notes && (
            <View>
              <Text variant="label" color="muted" style={styles.sectionLabel}>NOTES</Text>
              <Card>
                <Text variant="body" color="muted">{appt.notes}</Text>
              </Card>
            </View>
          )}

          {/* Booking info */}
          <View>
            <Text variant="label" color="muted" style={styles.sectionLabel}>BOOKING INFO</Text>
            <Card padded={false}>
              <View style={styles.infoRow}>
                <Text variant="bodySmall" color="muted">Source</Text>
                <Text variant="body" style={{ textTransform: 'capitalize' }}>{appt.source}</Text>
              </View>
              <View style={[styles.infoRow, styles.serviceBorder]}>
                <Text variant="bodySmall" color="muted">Booking ID</Text>
                <Text variant="mono" color="muted" style={{ fontSize: 11 }}>{appt.id.slice(0, 8).toUpperCase()}</Text>
              </View>
            </Card>
          </View>

          {/* Actions */}
          {actions.length > 0 && (
            <View style={styles.actionsBlock}>
              <Text variant="label" color="muted" style={styles.sectionLabel}>ACTIONS</Text>
              {actions.map((action) => (
                <Button
                  key={action.next}
                  label={action.label}
                  variant={action.variant === 'destructive' ? 'secondary' : action.variant ?? 'primary'}
                  size="lg"
                  fullWidth
                  onPress={() => handleAction(action)}
                  style={action.variant === 'destructive' ? { borderColor: colors.gray300 } : {}}
                />
              ))}
            </View>
          )}

          {/* Terminal states */}
          {(appt.status === 'completed' || appt.status === 'cancelled' || appt.status === 'no_show') && (
            <Card style={styles.terminalCard}>
              <Ionicons
                name={appt.status === 'completed' ? 'checkmark-circle' : 'close-circle'}
                size={32}
                color={appt.status === 'completed' ? colors.black : colors.gray400}
              />
              <Text variant="body" style={{ marginTop: spacing.sm, textAlign: 'center' }}>
                {appt.status === 'completed' ? 'Service completed' : `Appointment ${appt.status.replace('_', ' ')}`}
              </Text>
            </Card>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  content: { padding: spacing.lg, gap: spacing.lg },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  timeCard: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', overflow: 'hidden' },
  timeAccent: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  sectionLabel: { marginBottom: spacing.sm },
  statusBadge: {
    borderRadius: 99, paddingHorizontal: spacing.sm, paddingVertical: 3, marginRight: spacing.sm,
  },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  customerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.black,
    alignItems: 'center', justifyContent: 'center',
  },
  contactBtns: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1, borderColor: colors.gray200,
    alignItems: 'center', justifyContent: 'center',
  },
  serviceRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  serviceBorder: { borderTopWidth: 1, borderTopColor: colors.gray100 },
  totalRow: { backgroundColor: colors.gray50 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  actionsBlock: { gap: spacing.sm },
  terminalCard: { alignItems: 'center', paddingVertical: spacing.xl },
})
