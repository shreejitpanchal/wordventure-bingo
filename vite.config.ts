import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Wordventure Bingo',
        short_name: 'Wordventure',
        description: 'A kid-friendly word bingo and puzzle game, playable offline.',
        theme_color: '#7C3AED',
        background_color: '#F5F3FF',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // No network calls after first load: precache everything the app
        // needs so it works fully offline, including on repeat visits.
        globPatterns: ['**/*.{js,css,html,json,png,svg}'],
      },
    }),
  ],
  test: {
    globals: true,
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
