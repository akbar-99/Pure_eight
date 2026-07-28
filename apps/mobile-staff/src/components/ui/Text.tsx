import { Text as RNText, TextProps, StyleSheet } from 'react-native'
import { colors, typography } from '@/lib/theme'

type Variant = 'heading1' | 'heading2' | 'heading3' | 'body' | 'bodySmall' | 'label' | 'mono'
type Color = 'primary' | 'secondary' | 'muted' | 'inverse' | 'gold'

interface Props extends TextProps {
  variant?: Variant
  color?: Color
}

const colorMap: Record<Color, string> = {
  primary: colors.black,
  secondary: colors.gray700,
  muted: colors.gray400,
  inverse: colors.white,
  gold: colors.gold,
}

export function Text({ variant = 'body', color = 'primary', style, ...props }: Props) {
  return (
    <RNText
      style={[typography[variant], { color: colorMap[color] }, style]}
      {...props}
    />
  )
}
