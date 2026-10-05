import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // host: true exposes the dev server on the local network (the "Network" URL in the terminal)
  server: { port: 5174, host: true },
  preview: { port: 4174, host: true },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1400,
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|scheduler|cookie|set-cookie-parser)[\\/]/, priority: 40 },
            { name: 'gsap', test: /node_modules[\\/](gsap|@gsap|lenis)[\\/]/, priority: 30 },
            { name: 'tone', test: /node_modules[\\/](tone|standardized-audio-context|automation-events|tslib)[\\/]/, priority: 25 },
            { name: 'physics', test: /node_modules[\\/](matter-js|roughjs|@use-gesture)[\\/]/, priority: 20 },
            {
              name: 'three',
              test: /node_modules[\\/](three|@react-three|three-stdlib|troika-[\w-]+|camera-controls|maath|meshline|stats-gl|zustand|its-fine|suspend-react|react-use-measure|@monogrid|hls\.js|detect-gpu|tunnel-rat|three-mesh-bvh|@mediapipe)[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
})
