import { TouchableOpacity, View, ActivityIndicator, StyleSheet, TouchableOpacityProps } from 'react-native'
import { Text } from './Text'
import { colors, spacing, radius } from '@/lib/theme'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type Size = 'sm' | 'md' | 'lg'

interface Props extends TouchableOpacityProps {
  variant?: Variant
  size?: Size
  loading?: boolean
  label: string
  fullWidth?: boolean
}

const variantStyles = {
  primary: { bg: colors.black, text: colors.white, border: colors.black },
  secondary: { bg: colors.white, text: colors.black, border: colors.gray200 },
  ghost: { bg: 'transparent', text: colors.black, border: 'transparent' },
  destructive: { bg: colors.black, text: colors.white, border: colors.black },
}

const sizeStyles = {
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, minHeight: 36 },
  md: { paddingVertical: 12, paddingHorizontal: spacing.lg, minHeight: 44 },
  lg: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, minHeight: 52 },
}

export function Button({ variant = 'primary', size = 'md', loading, label, fullWidth, style, disabled, ...props }: Props) {
  const v = variantStyles[variant]
  const s = sizeStyles[size]

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={disabled || loading}
      style={[
        styles.base,
        s,
        { backgroundColor: v.bg, borderColor: v.border },
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <Text variant="label" style={{ color: v.text }}>{label}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.4 },
})
