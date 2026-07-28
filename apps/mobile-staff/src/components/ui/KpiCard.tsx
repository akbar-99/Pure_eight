import { View, StyleSheet } from 'react-native'
import { Card } from './Card'
import { Text } from './Text'
import { colors, spacing } from '@/lib/theme'

interface Props {
  label: string
  value: string
  delta?: string
  deltaPositive?: boolean
}

export function KpiCard({ label, value, delta, deltaPositive }: Props) {
  return (
    <Card style={styles.card}>
      <Text variant="label" color="muted">{label}</Text>
      <Text variant="heading2" style={styles.value}>{value}</Text>
      {delta && (
        <Text
          variant="bodySmall"
          style={{ color: deltaPositive ? colors.gray700 : colors.gray400 }}
        >
          {deltaPositive ? '↑' : '↓'} {delta}
        </Text>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { flex: 1 },
  value: { marginTop: spacing.xs, marginBottom: 2 },
})
