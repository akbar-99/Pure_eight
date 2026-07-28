import { useState } from 'react'
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { format, addDays, subDays, isSameDay } from 'date-fns'
import { Text } from '@/components/ui/Text'
import { useAppointmentsStore } from '@/stores/appointments-store'
import { colors, spacing, radius } from '@/lib/theme'

const HOURS = Array.from({ length: 13 }, (_, i) => i + 9) // 9 AM – 9 PM
const HOUR_HEIGHT = 72

const STATUS_COLOR: Record<string, string> = {
  pending:    colors.gray400,
  confirmed:  colors.gray700,
  checked_in: colors.gold,
  in_service: colors.black,
  completed:  colors.gray300,
  cancelled:  colors.gray200,
}

export default function CalendarScreen() {
  const [date, setDate] = useState(new Date())
  const { appointments, loading } = useAppointmentsStore()

  const dayAppts = appointments.filter((a) => isSameDay(new Date(a.startsAt), date))

  function getTopOffset(startsAt: string) {
    const d = new Date(startsAt)
    const hours = d.getHours() + d.getMinutes() / 60
    return (hours - 9) * HOUR_HEIGHT
  }

  function getHeight(startsAt: string, endsAt: string) {
    const start = new Date(startsAt)
    const end = new Date(endsAt)
    const mins = (end.getTime() - start.getTime()) / 60000
    return (mins / 60) * HOUR_HEIGHT
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Day navigator */}
      <View style={styles.dayNav}>
        <TouchableOpacity onPress={() => setDate(subDays(date, 1))} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.black} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDate(new Date())} style={styles.dateCenter}>
          <Text variant="heading3">{format(date, 'EEEE')}</Text>
          <Text variant="bodySmall" color="muted">{format(date, 'd MMMM yyyy')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDate(addDays(date, 1))} hitSlop={12}>
          <Ionicons name="chevron-forward" size={22} color={colors.black} />
        </TouchableOpacity>
      </View>

      {/* Summary strip */}
      {dayAppts.length > 0 && (
        <View style={styles.summaryStrip}>
          <Text variant="label" color="muted">{dayAppts.length} appointment{dayAppts.length !== 1 ? 's' : ''}</Text>
          <Text variant="label" color="muted">
            ₹{dayAppts.reduce((s, a) => s + a.items.reduce((ss, i) => ss + i.price, 0), 0).toLocaleString()} potential
          </Text>
        </View>
      )}

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Timeline */}
        <View style={styles.timelineContainer}>
          {/* Hour rows */}
          {HOURS.map((hour) => (
            <View key={hour} style={[styles.hourRow, { height: HOUR_HEIGHT }]}>
              <Text variant="label" color="muted" style={styles.hourLabel}>
                {hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
              </Text>
              <View style={styles.hourLine} />
            </View>
          ))}

          {/* Appointment blocks */}
          <View style={styles.apptLayer} pointerEvents="box-none">
            {dayAppts.map((appt) => {
              const top = getTopOffset(appt.startsAt)
              const height = Math.max(getHeight(appt.startsAt, appt.endsAt), 44)
              const bgColor = STATUS_COLOR[appt.status] ?? colors.gray400
              const services = appt.items.map((i) => i.serviceName).join(', ')

              return (
                <TouchableOpacity
                  key={appt.id}
                  style={[styles.apptBlock, { top, height, backgroundColor: bgColor === colors.gray200 ? colors.gray100 : colors.white, borderLeftColor: bgColor }]}
                  onPress={() => router.push(`/(tabs)/appointment/${appt.id}` as any)}
                  activeOpacity={0.85}
                >
                  <Text variant="body" style={styles.apptName} numberOfLines={1}>
                    {appt.customer?.fullName ?? 'Walk-in'}
                  </Text>
                  {height > 44 && (
                    <Text variant="bodySmall" color="muted" numberOfLines={1}>{services}</Text>
                  )}
                  {height > 60 && (
                    <Text variant="label" color="muted">
                      {format(new Date(appt.startsAt), 'h:mm a')} – {format(new Date(appt.endsAt), 'h:mm a')}
                    </Text>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {dayAppts.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={40} color={colors.gray300} />
            <Text variant="body" color="muted" style={{ marginTop: spacing.md }}>No appointments for this day</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  dayNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },
  dateCenter: { alignItems: 'center' },
  summaryStrip: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    backgroundColor: colors.gray50,
    borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },
  scroll: { flex: 1 },
  timelineContainer: { position: 'relative', paddingLeft: 64 },
  hourRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingLeft: spacing.sm,
  },
  hourLabel: { position: 'absolute', left: 0, top: -8, width: 56, textAlign: 'right', paddingRight: spacing.sm },
  hourLine: { flex: 1, height: 1, backgroundColor: colors.gray100, marginTop: 0 },
  apptLayer: {
    position: 'absolute', top: 0, left: 64, right: spacing.lg,
    bottom: 0,
  },
  apptBlock: {
    position: 'absolute', left: 4, right: 0,
    borderRadius: radius.sm, borderLeftWidth: 3,
    padding: spacing.sm, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.gray100,
  },
  apptName: { fontWeight: '600', fontSize: 13 },
  emptyState: { alignItems: 'center', paddingTop: spacing.xxl, paddingBottom: spacing.xxl },
})
