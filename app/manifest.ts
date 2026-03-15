import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Zhiyou AI Assistant',
    short_name: 'Zhiyou',
    description: 'Zhiyou AI Assistant powered by Gemini',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
      {
        src: '/icon?v=3',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon?v=3',
        sizes: '512x512',
        type: 'image/png',
      }
    ],
  }
}
