import { beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

beforeEach(() => {
  setActivePinia(createPinia())
})

// Mock for window.electron if needed
Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      send: vi.fn(),
      on: vi.fn(),
      invoke: vi.fn()
    }
  }
})

// Mock window.api
Object.defineProperty(window, 'api', {
  value: {
    // Add any necessary API mocks here
  }
})
