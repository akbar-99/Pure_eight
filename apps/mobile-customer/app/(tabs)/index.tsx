import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Text } from 'react-native'
import { PureEightLogo } from '@/components/ui/PureEightLogo'
import { colors, spacing, radius } from '@/lib/theme'

const SERVICES = ['Haircut', 'Colour', 'Facial', 'Massage', 'Waxing', 'Nails']

export default function DiscoverScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <PureEightLogo width={150} color="dark" />
            <Text style={styles.heading}>Discover</Text>
          </View>
          <TouchableOpacity style={styles.locationChip} activeOpacity={0.7}>
            <Ionicons name="location-outline" size={14} color={colors.gray600} />
            <Text style={styles.locationText}>Mumbai</Text>
            <Ionicons name="chevron-down" size={12} color={colors.gray600} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color={colors.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services, outlets…"
            placeholderTextColor={colors.gray400}
          />
        </View>

        {/* Service chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {SERVICES.map((svc) => (
            <TouchableOpacity key={svc} style={styles.chip} activeOpacity={0.7}>
              <Text style={styles.chipText}>{svc}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Nearby Outlets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NEARBY OUTLETS</Text>
          {[1, 2, 3].map((i) => (
            <TouchableOpacity key={i} style={styles.outletCard} activeOpacity={0.8}>
              <View style={styles.outletImage} />
              <View style={styles.outletInfo}>
                <Text style={styles.outletName}>Pure Eight — Bandra</Text>
                <Text style={styles.outletMeta}>1.2 km · Open until 9 PM</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={12} color={colors.gold} />
                  <Text style={styles.rating}>4.8 (124)</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.gray300} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  brand: { fontSize: 11, fontWeight: '500', letterSpacing: 1.5, color: colors.gray400 },
  heading: { fontSize: 26, fontWeight: '700', color: colors.black, marginTop: 2 },
  locationChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: colors.gray200,
    borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 6,
    marginTop: spacing.xs,
  },
  locationText: { fontSize: 13, color: colors.gray700, fontWeight: '500' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    paddingHorizontal: spacing.md, height: 46,
    borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.md,
    backgroundColor: colors.gray50,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.black },
  chips: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.md },
  chip: {
    borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    backgroundColor: colors.white,
  },
  chipText: { fontSize: 13, color: colors.gray700, fontWeight: '500' },
  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  sectionTitle: {
    fontSize: 11, fontWeight: '600', letterSpacing: 1, color: colors.gray400,
    marginBottom: spacing.md,
  },
  outletCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },
  outletImage: {
    width: 64, height: 64, borderRadius: radius.sm,
    backgroundColor: colors.gray100,
  },
  outletInfo: { flex: 1, gap: 3 },
  outletName: { fontSize: 16, fontWeight: '600', color: colors.black },
  outletMeta: { fontSize: 13, color: colors.gray500 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating: { fontSize: 12, color: colors.gray500 },
})
