import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNavigationStore } from '../navigationStore'

describe('navigationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should initialize with home view', () => {
    const store = useNavigationStore()
    expect(store.activeView).toBe('home')
    expect(store.activeServerId).toBeNull()
  })

  it('should set active view and clear context if not server', () => {
    const store = useNavigationStore()
    store.setServer('s-1', 'c-1')
    expect(store.activeView).toBe('server')
    expect(store.activeServerId).toBe('s-1')

    store.setActiveView('friends')
    expect(store.activeView).toBe('friends')
    expect(store.activeServerId).toBeNull()
    expect(store.activeChannelId).toBeNull()
  })

  it('should set DM context', () => {
    const store = useNavigationStore()
    store.setDM('u-recipient')
    expect(store.activeView).toBe('home')
    expect(store.activeRecipientId).toBe('u-recipient')
    expect(store.activeServerId).toBeNull()
  })
})
