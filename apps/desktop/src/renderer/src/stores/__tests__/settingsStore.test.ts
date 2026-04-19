import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from '../settingsStore'
import { nextTick } from 'vue'

describe('settingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('should initialize with default values', () => {
    const store = useSettingsStore()
    expect(store.theme).toBe('dark')
    expect(store.language).toBe('ca')
    expect(store.chatFontSize).toBe(14)
  })

  it('should toggle theme', () => {
    const store = useSettingsStore()
    store.toggleTheme()
    expect(store.theme).toBe('light')
    store.toggleTheme()
    expect(store.theme).toBe('dark')
  })

  it('should persist settings in localStorage', async () => {
    const store = useSettingsStore()
    
    store.setTheme('light')
    await nextTick()
    expect(localStorage.getItem('vertex-theme')).toBe('light')
    
    store.setLanguage('en')
    await nextTick()
    expect(localStorage.getItem('vertex-lang')).toBe('en')
    
    store.setFontSize(18)
    await nextTick()
    expect(localStorage.getItem('vertex-fontsize')).toBe('18')
  })

  it('should load initial values from localStorage', () => {
    localStorage.setItem('vertex-theme', 'light')
    localStorage.setItem('vertex-lang', 'es')
    localStorage.setItem('vertex-fontsize', '20')
    
    const store = useSettingsStore()
    expect(store.theme).toBe('light')
    expect(store.language).toBe('es')
    expect(store.chatFontSize).toBe(20)
  })
})
