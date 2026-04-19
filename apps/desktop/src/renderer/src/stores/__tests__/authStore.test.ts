import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../authStore'
import { SecureStorage } from '../../utils/environment'

// Mock SecureStorage
vi.mock('../../utils/environment', () => ({
  SecureStorage: {
    saveToken: vi.fn(),
    loadToken: vi.fn(),
    clearToken: vi.fn(),
    saveRefreshToken: vi.fn(),
    getRefreshToken: vi.fn(),
    clearRefreshToken: vi.fn(),
  }
}))

// Mock fetch
vi.stubGlobal('fetch', vi.fn())

describe('authStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('should start with null user and token', () => {
    const store = useAuthStore()
    expect(store.user).toBeNull()
    expect(store.token).toBeNull()
  })

  it('should login successfully', async () => {
    const store = useAuthStore()
    const mockUser = { id: '1', username: 'test' }
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        user: mockUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      })
    }
    
    ;(fetch as any).mockResolvedValue(mockResponse)

    await store.login('test@test.com', 'password')

    expect(store.user).toEqual(mockUser)
    expect(store.token).toBe('access-token')
    expect(SecureStorage.saveToken).toHaveBeenCalledWith('access-token')
    expect(SecureStorage.saveRefreshToken).toHaveBeenCalledWith('refresh-token')
  })

  it('should logout successfully', async () => {
    const store = useAuthStore()
    store.user = { id: '1', username: 'test', email: 'test@test.com', status: 'online' }
    
    ;(fetch as any).mockResolvedValue({ ok: true })

    await store.logout()

    expect(store.user).toBeNull()
    expect(store.token).toBeNull()
    expect(SecureStorage.clearToken).toHaveBeenCalled()
    expect(SecureStorage.clearRefreshToken).toHaveBeenCalled()
  })
})
