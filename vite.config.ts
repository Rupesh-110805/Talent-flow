import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('@tanstack')) return 'react-query'
          if (id.includes('@chakra-ui') || id.includes('@emotion') || id.includes('@zag-js')) return 'chakra-ui'
          if (id.includes('react-router')) return 'react-router'
          if (id.includes('framer-motion')) return 'framer-motion'
          if (id.includes('react-hook-form')) return 'react-hook-form'
          if (id.includes('dexie')) return 'dexie'
          if (id.includes('zustand')) return 'zustand'
          if (id.includes('zod')) return 'zod'

          return 'vendor'
        },
      },
    },
    chunkSizeWarningLimit: 1600,
  },
})
