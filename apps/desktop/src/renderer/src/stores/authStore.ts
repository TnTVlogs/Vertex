import { defineStore } from 'pinia'
import { ref } from 'vue'
import { User } from '@shared/models'
import { ENV } from '../utils/env'
import { SecureStorage } from '../utils/environment'

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | null>(null)
    const token = ref<string | null>(null)

    // ── REFRESH ACCESS TOKEN ──────────────────────────────────────────────────
    // Crida /auth/refresh amb el refresh token guardat a disc.
    // Retorna true si ha tingut èxit, false si ha fallat (sessió expirada).
    async function refreshAccessToken(): Promise<boolean> {
        try {
            const refreshToken = await SecureStorage.getRefreshToken()
            if (!refreshToken) return false

            const res = await fetch(`${ENV.API_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            })

            if (!res.ok) {
                await clearAll()
                return false
            }

            const data = await res.json()
            token.value = data.accessToken
            await SecureStorage.saveToken(data.accessToken)
            if (data.refreshToken) {
                await SecureStorage.saveRefreshToken(data.refreshToken)
            }
            return true
        } catch (e) {
            console.error('refreshAccessToken failed:', e)
            return false
        }
    }

    // ── INIT (arrencada de l'app) ─────────────────────────────────────────────
    // 1. Intenta carregar l'access token guardat.
    // 2. Si és vàlid → login automàtic.
    // 3. Si ha expirat (401) → intenta refrescar amb el refresh token.
    // 4. Si el refresh falla → logout silenciós.
    async function init() {
        if (localStorage.getItem('token')) {
            localStorage.removeItem('token')
        }

        const savedToken = await SecureStorage.loadToken()

        if (!savedToken) {
            await tryBootstrapFromRefresh()
            return
        }

        token.value = savedToken

        try {
            const res = await fetch(`${ENV.API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token.value}` }
            })

            if (res.ok) {
                const data = await res.json()
                user.value = data.user
            } else if (res.status === 401) {
                token.value = null
                await tryBootstrapFromRefresh()
            } else {
                await clearAll()
            }
        } catch (e) {
            console.error('Auth init failed:', e)
        }
    }

    // Helper privat: intentar login des del refresh token (sense user.value)
    // Usat en l'arrencada quan no tenim user.id encara.
    async function tryBootstrapFromRefresh() {
        try {
            const refreshToken = await SecureStorage.getRefreshToken()
            if (!refreshToken) return

            const res = await fetch(`${ENV.API_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            })

            if (!res.ok) {
                await clearAll()
                return
            }

            const data = await res.json()
            token.value = data.accessToken
            await SecureStorage.saveToken(data.accessToken)
            if (data.refreshToken) {
                await SecureStorage.saveRefreshToken(data.refreshToken)
            }

            const meRes = await fetch(`${ENV.API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token.value}` }
            })

            if (meRes.ok) {
                const data = await meRes.json()
                user.value = data.user
            } else {
                await clearAll()
            }
        } catch (e) {
            console.error('Bootstrap from refresh failed:', e)
            await clearAll()
        }
    }

    // ── LOGIN ─────────────────────────────────────────────────────────────────
    async function login(email: string, password: string) {
        const response = await fetch(`${ENV.API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })

        if (!response.ok) throw new Error('Login failed')

        const data = await response.json()
        user.value = data.user

        // Compatibilitat: el servidor nou retorna `accessToken`, l'antic `token`
        const accessToken: string | undefined = data.accessToken ?? data.token
        const refreshToken: string | undefined = data.refreshToken

        if (!accessToken) throw new Error('Server did not return a valid token')

        token.value = accessToken

        // Guardar access token encriptat o web pass
        await SecureStorage.saveToken(accessToken)

        // Guardar refresh token encriptat (només si el servidor el retorna)
        if (refreshToken) {
            await SecureStorage.saveRefreshToken(refreshToken)
        }

    }

    // ── LOGOUT ────────────────────────────────────────────────────────────────
    async function logout() {
        try {
            const refreshToken = await SecureStorage.getRefreshToken()
            if (refreshToken) {
                await fetch(`${ENV.API_URL}/auth/logout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken })
                })
            }
        } catch (e) {
            console.error('Server logout failed:', e)
        }
        await clearAll()
    }

    // ── HELPER PRIVAT ─────────────────────────────────────────────────────────
    async function clearAll() {
        user.value = null
        token.value = null
        await SecureStorage.clearToken()
        await SecureStorage.clearRefreshToken()
    }

    return { user, token, login, logout, init, refreshAccessToken }
})
