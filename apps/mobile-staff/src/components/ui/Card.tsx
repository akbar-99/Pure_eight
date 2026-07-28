import { View, StyleSheet, ViewProps } from 'react-native'
import { colors, spacing, radius, shadow } from '@/lib/theme'

interface Props extends ViewProps {
  padded?: boolean
}

export function Card({ padded = true, style, children, ...props }: Props) {
  return (
    <View
      style={[styles.card, padded && styles.padded, style]}
      {...props}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray100,
    ...shadow.card,
  },
  padded: {
    padding: spacing.md,
  },
})
