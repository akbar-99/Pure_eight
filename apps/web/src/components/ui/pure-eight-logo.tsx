interface PureEightLogoProps {
  /** Rendered width in px. Height is auto-calculated at ~1:4.7 ratio. */
  width?: number
  /** 'dark' = black ink (default), 'light' = white ink for dark backgrounds */
  color?: 'dark' | 'light'
  className?: string
}

/**
 * Pure Eight | Unisex Salon — full horizontal lockup.
 * Matches the brand logo: PURE + stylised 8 (double-oval) | UNISEX SALON
 */
export function PureEightLogo({ width = 200, color = 'dark', className }: PureEightLogoProps) {
  const fill = color === 'light' ? '#FFFFFF' : '#1A1A1A'
  const h = Math.round(width / 4.5)

  return (
    <svg
      width={width}
      height={h}
      viewBox="0 0 230 51"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Pure Eight Unisex Salon"
      role="img"
    >
      {/* PURE */}
      <text
        x="0" y="38"
        fontSize="42" fontWeight="800" letterSpacing="-1"
        fill={fill} fontFamily="system-ui, -apple-system, sans-serif"
      >
        PURE
      </text>

      {/* Stylised 8 — double concentric ovals */}
      <g transform="translate(112,25)">
        {/* Outer oval */}
        <ellipse cx="0" cy="0" rx="15" ry="22" stroke={fill} strokeWidth="1.8" />
        {/* Inner oval */}
        <ellipse cx="0" cy="0" rx="9" ry="13.5" stroke={fill} strokeWidth="1.5" />
        {/* 8 numeral centred */}
        <text
          x="0" y="7.5"
          fontSize="21" fontWeight="800"
          fill={fill} fontFamily="system-ui, -apple-system, sans-serif"
          textAnchor="middle"
        >
          8
        </text>
      </g>

      {/* Vertical divider */}
      <line x1="140" y1="7" x2="140" y2="44" stroke={fill} strokeWidth="1.5" />

      {/* UNISEX — vertically centred against the PURE8 lockup */}
      <text
        x="151" y="22"
        fontSize="14.5" fontWeight="600" letterSpacing="3.5"
        fill={fill} fontFamily="system-ui, -apple-system, sans-serif"
      >
        UNISEX
      </text>

      {/* SALON */}
      <text
        x="151" y="40"
        fontSize="14.5" fontWeight="600" letterSpacing="3.5"
        fill={fill} fontFamily="system-ui, -apple-system, sans-serif"
      >
        SALON
      </text>
    </svg>
  )
}

/**
 * Compact mark — just the double-oval "8" — for collapsed sidebar / favicon use.
 */
export function PureEightMark({ size = 32, color = 'dark', className }: { size?: number; color?: 'dark' | 'light'; className?: string }) {
  const fill = color === 'light' ? '#FFFFFF' : '#1A1A1A'

  return (
    <svg
      width={size} height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Pure Eight"
      role="img"
    >
      <ellipse cx="16" cy="16" rx="13" ry="14.5" stroke={fill} strokeWidth="1.8" />
      <ellipse cx="16" cy="16" rx="7.5" ry="8.5" stroke={fill} strokeWidth="1.5" />
      <text
        x="16" y="20.5"
        fontSize="14" fontWeight="800"
        fill={fill} fontFamily="system-ui, -apple-system, sans-serif"
        textAnchor="middle"
      >
        8
      </text>
    </svg>
  )
}
