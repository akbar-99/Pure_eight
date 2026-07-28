import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Text } from 'react-native'
import { colors, spacing, radius } from '@/lib/theme'

export default function BookingsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.heading}>My Bookings</Text>
        <TouchableOpacity style={styles.bookBtn} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color={colors.white} />
          <Text style={styles.bookBtnText}>Book Now</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['Upcoming', 'Past'].map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tab, tab === 'Upcoming' && styles.tabActive]}>
            <Text style={[styles.tabText, tab === 'Upcoming' && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color={colors.gray200} />
          <Text style={styles.emptyHeading}>No upcoming bookings</Text>
          <Text style={styles.emptyBody}>Book your next visit at a Pure Eight outlet</Text>
          <TouchableOpacity style={styles.emptyBtn} activeOpacity={0.8}>
            <Text style={styles.emptyBtnText}>Explore Outlets</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  heading: { fontSize: 22, fontWeight: '700', color: colors.black },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.black, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  bookBtnText: { fontSize: 13, color: colors.white, fontWeight: '600' },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: colors.gray100,
    paddingHorizontal: spacing.lg,
  },
  tab: { paddingVertical: spacing.md, marginRight: spacing.xl, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.black },
  tabText: { fontSize: 14, fontWeight: '500', color: colors.gray400 },
  tabTextActive: { color: colors.black },
  content: { flex: 1 },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: spacing.sm, paddingHorizontal: spacing.xl },
  emptyHeading: { fontSize: 18, fontWeight: '600', color: colors.black, marginTop: spacing.md },
  emptyBody: { fontSize: 14, color: colors.gray500, textAlign: 'center' },
  emptyBtn: {
    marginTop: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.black, borderRadius: radius.full,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: colors.black },
})
