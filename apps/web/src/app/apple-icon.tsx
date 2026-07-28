import { ImageResponse } from 'next/og'

// iOS home-screen icon. Apple ignores transparency and does not honour SVG,
// so this is generated as a flat 180x180 PNG at build time.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      // The mark is drawn from bordered divs rather than text — ImageResponse
      // would otherwise need an embedded font to rasterise a glyph.
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#000000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '12px solid #FFFFFF',
            marginBottom: -12,
          }}
        />
        <div
          style={{
            width: 62,
            height: 62,
            borderRadius: '50%',
            border: '12px solid #FFFFFF',
          }}
        />
      </div>
    ),
    { ...size }
  )
}
