import Svg, { Text, Line, Ellipse, G } from 'react-native-svg'
import { View } from 'react-native'

interface Props {
  /** Width of the rendered logo. Height is auto-calculated at ~1:4.7 ratio. */
  width?: number
  /** 'dark' = black on transparent (default), 'light' = white on transparent */
  color?: 'dark' | 'light'
}

/**
 * Pure Eight | Unisex Salon — SVG logo component.
 * Matches the brand logo: PURE + stylised 8 (double-oval) | UNISEX SALON
 */
export function PureEightLogo({ width = 240, color = 'dark' }: Props) {
  const fill = color === 'light' ? '#FFFFFF' : '#1A1A1A'
  const h = width / 4.7
  const s = width / 240   // scale factor

  return (
    <View style={{ width, height: h }}>
      <Svg width={width} height={h} viewBox="0 0 240 51">

        {/* ── "PURE" ── */}
        <Text
          x="0"
          y="38"
          fontSize="42"
          fontWeight="800"
          letterSpacing="-1"
          fill={fill}
          fontFamily="System"
        >
          PURE
        </Text>

        {/* ── Stylised "8" with double concentric ovals ── */}
        <G transform="translate(112, 25)">
          {/* Outer oval */}
          <Ellipse cx="0" cy="0" rx="15" ry="22" fill="none" stroke={fill} strokeWidth="1.5" />
          {/* Inner oval */}
          <Ellipse cx="0" cy="0" rx="9.5" ry="14" fill="none" stroke={fill} strokeWidth="1.5" />
          {/* The "8" digit centred inside */}
          <Text
            x="0"
            y="7"
            fontSize="22"
            fontWeight="800"
            fill={fill}
            fontFamily="System"
            textAnchor="middle"
          >
            8
          </Text>
        </G>

        {/* ── Vertical divider ── */}
        <Line x1="140" y1="4" x2="140" y2="48" stroke={fill} strokeWidth="1.5" />

        {/* ── "UNISEX" ── */}
        <Text
          x="150"
          y="26"
          fontSize="15"
          fontWeight="600"
          letterSpacing="3"
          fill={fill}
          fontFamily="System"
        >
          UNISEX
        </Text>

        {/* ── "SALON" ── */}
        <Text
          x="150"
          y="44"
          fontSize="15"
          fontWeight="600"
          letterSpacing="3"
          fill={fill}
          fontFamily="System"
        >
          SALON
        </Text>

      </Svg>
    </View>
  )
}
