import { View, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Text } from 'react-native'
import { colors, spacing, radius } from '@/lib/theme'

const PERKS = [
  { icon: 'gift-outline', label: 'Birthday Treat', desc: 'Free service on your birthday' },
  { icon: 'ribbon-outline', label: 'Priority Booking', desc: 'Skip the queue as a Gold member' },
  { icon: 'pricetag-outline', label: 'Member Discounts', desc: 'Up to 15% off all services' },
]

export default function LoyaltyScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Points card */}
        <View style={styles.pointsCard}>
          <Text style={styles.brandLabel}>PURE EIGHT LOYALTY</Text>
          <View style={styles.pointsRow}>
            <View>
              <Text style={styles.pointsValue}>0</Text>
              <Text style={styles.pointsLabel}>Points balance</Text>
            </View>
            <View style={styles.tierBadge}>
              <Text style={styles.tierText}>SILVER</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '0%' }]} />
          </View>
          <Text style={styles.progressLabel}>500 pts to Gold</Text>
        </View>

        {/* History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={32} color={colors.gray200} />
            <Text style={styles.emptyText}>No activity yet</Text>
          </View>
        </View>

        {/* Perks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>YOUR PERKS</Text>
          {PERKS.map((perk) => (
            <View key={perk.label} style={styles.perkRow}>
              <View style={styles.perkIcon}>
                <Ionicons name={perk.icon as any} size={20} color={colors.black} />
              </View>
              <View>
                <Text style={styles.perkLabel}>{perk.label}</Text>
                <Text style={styles.perkDesc}>{perk.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  pointsCard: {
    margin: spacing.lg, padding: spacing.xl,
    backgroundColor: colors.black, borderRadius: radius.lg,
  },
  brandLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.5, color: colors.gray500, marginBottom: spacing.lg },
  pointsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  pointsValue: { fontSize: 48, fontWeight: '700', color: colors.white, lineHeight: 52 },
  pointsLabel: { fontSize: 13, color: colors.gray500, marginTop: 2 },
  tierBadge: {
    borderWidth: 1, borderColor: colors.gold,
    borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  tierText: { fontSize: 11, fontWeight: '700', color: colors.gold, letterSpacing: 1 },
  progressBar: {
    height: 2, backgroundColor: colors.gray800, borderRadius: 1, marginTop: spacing.lg,
  },
  progressFill: { height: 2, backgroundColor: colors.gold, borderRadius: 1 },
  progressLabel: { fontSize: 12, color: colors.gray500, marginTop: spacing.sm },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 1, color: colors.gray400, marginBottom: spacing.md },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { fontSize: 14, color: colors.gray400 },
  perkRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },
  perkIcon: {
    width: 44, height: 44, borderRadius: radius.sm,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray100,
    alignItems: 'center', justifyContent: 'center',
  },
  perkLabel: { fontSize: 15, fontWeight: '600', color: colors.black },
  perkDesc: { fontSize: 13, color: colors.gray500, marginTop: 2 },
})
