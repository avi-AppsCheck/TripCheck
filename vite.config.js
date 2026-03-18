import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'TripCheck New_Logo.png', 'TripCheck New_favicon2.png'],
      manifest: {
        name: 'TripCheck',
        short_name: 'TripCheck',
        description: 'ניהול נוכחות בשטח בקלות',
        theme_color: '#ffffff',
        background_color: '#f3f4f6',
        display: 'standalone',
        orientation: 'portrait',
        dir: 'rtl',
        lang: 'he',
        icons: [
          {
            src: 'favicon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'favicon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
