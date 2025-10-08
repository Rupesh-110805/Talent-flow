import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const repoBase = '/Talent-flow/'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? repoBase : '/',
  plugins: [react()],
})
