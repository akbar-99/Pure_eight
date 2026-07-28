import { TextInput, View, StyleSheet, TextInputProps } from 'react-native'
import { Text } from './Text'
import { colors, spacing, radius, typography } from '@/lib/theme'

interface Props extends TextInputProps {
  label?: string
  error?: string
}

export function Input({ label, error, style, ...props }: Props) {
  return (
    <View style={styles.wrapper}>
      {label && <Text variant="label" color="muted" style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={colors.gray400}
        selectionColor={colors.black}
        {...props}
      />
      {error && <Text variant="bodySmall" color="muted" style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { marginBottom: 2 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    ...typography.body,
    color: colors.black,
  },
  inputError: { borderColor: colors.gray700 },
  error: { marginTop: 2 },
})
