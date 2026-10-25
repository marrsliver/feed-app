import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Research Feed',
    short_name: 'Feed',
    description: 'Today’s edition from your research sources',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [{ src: '/icon', sizes: '512x512', type: 'image/png' }],
  }
}
