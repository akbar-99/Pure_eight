import type { MetadataRoute } from 'next'

// Drives the Android/Chrome install prompt, the PWA splash screen, and the icon
// shown in browser search/history surfaces.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pure Eight — Franchise Management',
    short_name: 'Pure Eight',
    description: 'Premium business management platform for franchise networks',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#000000',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
