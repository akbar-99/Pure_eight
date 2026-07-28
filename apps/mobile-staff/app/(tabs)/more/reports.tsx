import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { colors, spacing } from '@/lib/theme'
import { Stack } from 'expo-router'

const REPORT_TYPES = [
  { label: 'Daily Summary', icon: 'today-outline', desc: 'Revenue, bills and footfall for today' },
  { label: 'Staff Performance', icon: 'people-outline', desc: 'Revenue and service count per staff' },
  { label: 'Service Report', icon: 'cut-outline', desc: 'Top services by count and revenue' },
  { label: 'Product Sales', icon: 'bag-outline', desc: 'Retail product movement' },
  { label: 'Payment Modes', icon: 'card-outline', desc: 'Cash, card, UPI and wallet split' },
]

export default function ReportsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Reports', headerLargeTitle: true }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Today snapshot */}
          <Text variant="label" color="muted" style={styles.sectionLabel}>TODAY'S SNAPSHOT</Text>
          <View style={styles.kpiRow}>
            <KpiCard label="Revenue" value="₹0" delta="no data yet" />
            <KpiCard label="Bills" value="0" />
          </View>
          <View style={[styles.kpiRow, { marginTop: spacing.sm }]}>
            <KpiCard label="Avg Bill" value="₹0" />
            <KpiCard label="Footfall" value="0" />
          </View>

          {/* Report list */}
          <Text variant="label" color="muted" style={[styles.sectionLabel, { marginTop: spacing.xl }]}>REPORT TYPES</Text>
          <Card padded={false}>
            {REPORT_TYPES.map((r, idx) => (
              <TouchableOpacity
                key={r.label}
                style={[styles.row, idx < REPORT_TYPES.length - 1 && styles.rowBorder]}
                activeOpacity={0.7}
              >
                <View style={styles.iconBox}>
                  <Ionicons name={r.icon as any} size={20} color={colors.black} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="body">{r.label}</Text>
                  <Text variant="bodySmall" color="muted">{r.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
              </TouchableOpacity>
            ))}
          </Card>
        </ScrollView>
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  content: { padding: spacing.lg, gap: spacing.sm },
  sectionLabel: { marginBottom: spacing.sm },
  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, minHeight: 60,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  iconBox: {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray100,
    alignItems: 'center', justifyContent: 'center',
  },
})
