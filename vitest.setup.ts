import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

if (!('scrollTo' in window)) {
  vi.stubGlobal('scrollTo', () => {})
}
