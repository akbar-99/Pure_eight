import { ScrollView, View, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { useAuthStore } from '@/stores/auth-store'
import { useRole } from '@/hooks/useRole'
import { useAppointmentsStore, type Appointment } from '@/stores/appointments-store'
import { PureEightLogo } from '@/components/ui/PureEightLogo'
import { colors, spacing, radius } from '@/lib/theme'

const MANAGER_ACTIONS = [
  { label: 'New Sale', icon: 'receipt-outline', route: '/(tabs)/pos' },
  { label: 'Appointment', icon: 'calendar-outline', route: '/(tabs)/calendar' },
  { label: 'Check In', icon: 'qr-code-outline', route: '/(tabs)/pos' },
  { label: 'Customer', icon: 'person-add-outline', route: '/(tabs)/customers' },
] as const

const STAFF_ACTIONS = [
  { label: 'My Calendar', icon: 'calendar-outline', route: '/(tabs)/calendar' },
  { label: 'Clock In', icon: 'finger-print-outline', route: '/(tabs)/more/attendance' },
  { label: 'Customers', icon: 'people-outline', route: '/(tabs)/customers' },
  { label: 'New Sale', icon: 'receipt-outline', route: '/(tabs)/pos' },
] as const

const STATUS_COLOR: Record<string, string> = {
  pending:    colors.gray400,
  confirmed:  colors.gray700,
  checked_in: colors.gold,
  in_service: colors.black,
  completed:  colors.gray300,
  cancelled:  colors.gray300,
}

function NextAppointmentCard({ appt }: { appt: Appointment }) {
  const time = format(new Date(appt.startsAt), 'h:mm a')
  const duration = appt.items.reduce((s, i) => s + i.durationMins, 0)
  const services = appt.items.map((i) => i.serviceName).join(', ')
  return (
    <TouchableOpacity
      style={styles.apptCard}
      onPress={() => router.push(`/(tabs)/appointment/${appt.id}` as any)}
      activeOpacity={0.8}
    >
      <View style={[styles.apptStatusBar, { backgroundColor: STATUS_COLOR[appt.status] ?? colors.gray300 }]} />
      <View style={{ flex: 1 }}>
        <View style={styles.apptRow}>
          <Text variant="heading3">{appt.customer?.fullName ?? 'Walk-in'}</Text>
          <Text variant="label" color="muted">{time}</Text>
        </View>
        <Text variant="bodySmall" color="muted" style={{ marginTop: 2 }}>{services}</Text>
        <View style={styles.apptMeta}>
          <Ionicons name="time-outline" size={12} color={colors.gray400} />
          <Text variant="label" color="muted">{duration} min</Text>
          <View style={styles.statusPill}>
            <Text variant="label" style={{ color: colors.white, fontSize: 9 }}>
              {appt.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.gray300} />
    </TouchableOpacity>
  )
}

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user)
  const { isManager, isStaff, role } = useRole()
  const { appointments, loading, error } = useAppointmentsStore()

  const upcoming = appointments
    .filter((a) => !['completed', 'cancelled', 'no_show'].includes(a.status))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())

  const nextAppt = upcoming[0] ?? null
  const todayCount = appointments.length
  const completedCount = appointments.filter((a) => a.status === 'completed').length

  const quickActions = isManager ? MANAGER_ACTIONS : STAFF_ACTIONS

  const roleBadge = {
    hq_admin: 'HQ Admin',
    franchisee_owner: 'Franchisee Owner',
    outlet_manager: 'Outlet Manager',
    staff: 'Staff',
  }[role]

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <PureEightLogo width={130} color="dark" />
            <Text variant="bodySmall" color="muted">
              {user?.user_metadata?.full_name?.split(' ')[0] ?? 'Welcome'} · Today
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.rolePill}>
              <Text variant="label" style={{ color: colors.white, fontSize: 10 }}>{roleBadge}</Text>
            </View>
            <View style={styles.avatar}>
              <Ionicons name="person" size={20} color={colors.white} />
            </View>
          </View>
        </View>

        {/* ── MANAGER VIEW ── */}
        {isManager && (
          <>
            <View>
              <Text variant="label" color="muted" style={styles.sectionLabel}>Outlet Numbers</Text>
              <View style={styles.kpiRow}>
                <KpiCard label="Revenue" value="₹0" delta="vs yesterday" deltaPositive />
                <KpiCard label="Bills" value="0" />
              </View>
              <View style={[styles.kpiRow, { marginTop: spacing.sm }]}>
                <KpiCard label="Appointments" value="0" />
                <KpiCard label="Avg Bill" value="₹0" />
              </View>
            </View>
          </>
        )}

        {/* ── STAFF VIEW — their own schedule ── */}
        {isStaff && (
          <View>
            <Text variant="label" color="muted" style={styles.sectionLabel}>My Schedule</Text>
            <View style={styles.kpiRow}>
              <KpiCard label="My Appointments" value={String(todayCount)} />
              <KpiCard label="Completed" value={String(completedCount)} />
            </View>
          </View>
        )}

        {/* Quick Actions — filtered by role */}
        <View>
          <Text variant="label" color="muted" style={styles.sectionLabel}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.actionTile}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.7}
              >
                <Ionicons name={action.icon as any} size={24} color={colors.black} />
                <Text variant="bodySmall" style={{ marginTop: spacing.xs }}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Next Appointment */}
        <View>
          <View style={styles.sectionHeader}>
            <Text variant="label" color="muted">
              {isManager ? 'NEXT APPOINTMENT' : 'MY NEXT APPOINTMENT'}
            </Text>
            {appointments.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/(tabs)/calendar' as any)}>
                <Text variant="label" style={{ color: colors.gray500 }}>See All →</Text>
              </TouchableOpacity>
            )}
          </View>
          {loading ? (
            <Card><Text variant="body" color="muted" style={{ textAlign: 'center', paddingVertical: spacing.md }}>Loading…</Text></Card>
          ) : error ? (
            <Card style={{ borderColor: colors.gray200 }}>
              <Text variant="bodySmall" color="muted" style={{ textAlign: 'center', paddingVertical: spacing.sm }}>{error}</Text>
            </Card>
          ) : nextAppt ? (
            <NextAppointmentCard appt={nextAppt} />
          ) : (
            <Card><Text variant="body" color="muted" style={{ textAlign: 'center', paddingVertical: spacing.md }}>No upcoming appointments today</Text></Card>
          )}
        </View>

        {/* Manager: all today's appointments */}
        {isManager && appointments.length > 0 && (
          <View>
            <Text variant="label" color="muted" style={[styles.sectionLabel, styles.sectionHeader]}>
              TODAY'S APPOINTMENTS ({appointments.length})
            </Text>
            {appointments.slice(0, 3).map((appt) => (
              <NextAppointmentCard key={appt.id} appt={appt} />
            ))}
            {appointments.length > 3 && (
              <TouchableOpacity style={styles.seeAll} onPress={() => router.push('/(tabs)/calendar' as any)}>
                <Text variant="label" color="muted">+{appointments.length - 3} more → View Calendar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { gap: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rolePill: {
    backgroundColor: colors.gray700,
    borderRadius: 99,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.black,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionLabel: { marginBottom: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  apptCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.white, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.gray100,
    overflow: 'hidden', marginBottom: spacing.sm,
  },
  apptStatusBar: { width: 4, alignSelf: 'stretch' },
  apptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  apptMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  statusPill: {
    backgroundColor: colors.gray800, borderRadius: 99,
    paddingHorizontal: 6, paddingVertical: 2, marginLeft: spacing.sm,
  },
  seeAll: { alignItems: 'center', paddingVertical: spacing.sm },
  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionTile: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray100,
    padding: spacing.md,
    alignItems: 'flex-start',
    gap: 4,
    minHeight: 80,
    justifyContent: 'center',
  },
})
