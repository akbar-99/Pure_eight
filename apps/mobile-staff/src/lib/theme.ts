export const colors = {
  black: '#000000',
  white: '#FFFFFF',
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#E5E5E5',
  gray300: '#D4D4D4',
  gray400: '#A3A3A3',
  gray500: '#737373',
  gray600: '#525252',
  gray700: '#404040',
  gray800: '#262626',
  gray900: '#171717',
  // single metallic accent for status emphasis
  gold: '#C9A84C',
} as const

export const typography = {
  heading1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  heading2: { fontSize: 22, fontWeight: '600' as const, letterSpacing: -0.3 },
  heading3: { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodySmall: { fontSize: 13, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '500' as const, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  mono: { fontSize: 15, fontFamily: 'monospace' as const },
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

export const radius = {
  sm: 6,
  md: 12,
  lg: 16,
  full: 999,
} as const

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
} as const
