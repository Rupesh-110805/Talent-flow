import { createSystem, defaultConfig } from '@chakra-ui/react'

const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#f1f6ff' },
          100: { value: '#dce7ff' },
          200: { value: '#b3c8ff' },
          300: { value: '#8aa9ff' },
          400: { value: '#628bff' },
          500: { value: '#4a72e6' },
          600: { value: '#3858b3' },
          700: { value: '#273f80' },
          800: { value: '#16254d' },
          900: { value: '#070d20' },
        },
      },
      fonts: {
        heading: { value: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
        body: { value: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
      },
      radii: {
        xl: { value: '1.5rem' },
      },
      shadows: {
        soft: { value: '0 20px 45px rgba(76, 106, 255, 0.12)' },
      },
    },
  },
  globalCss: {
    ':where(body)': {
      backgroundColor: { base: 'gray.50', _dark: 'gray.900' },
      color: { base: 'gray.800', _dark: 'gray.100' },
      fontFamily: 'body',
    },
  },
})

export default system
