import { defineStore } from 'pinia'
import { ref } from 'vue'
import { User } from '@shared/models'

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | null>(null)
    const token = ref<string | null>(null)

    // ── REFRESH ACCESS TOKEN ──────────────────────────────────────────────────
    // Crida /auth/refresh amb el refresh token guardat a disc.
    // Retorna true si ha tingut èxit, false si ha fallat (sessió expirada).
    async function refreshAccessToken(): Promise<boolean> {
        try {
            const refreshToken = await window.api.getRefreshToken()
            if (!refreshToken || !user.value?.id) return false

            const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken, userId: user.value.id })
            })

            if (!res.ok) {
                // Refresh token invàlid o expirat — netejar tot
                await _clearAll()
                return false
            }

            const data = await res.json()
            token.value = data.accessToken
            await window.api.saveToken(data.accessToken)
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
        console.log('authStore: init starting...')

        // Netejar tokens antics de localStorage (migracio)
        if (localStorage.getItem('token')) {
            localStorage.removeItem('token')
        }

        const savedToken = await window.api.loadToken()
        console.log('authStore: access token found:', savedToken ? 'YES' : 'NO')

        if (!savedToken) {
            // Sense access token, prova directament amb el refresh token
            await _tryBootstrapFromRefresh()
            return
        }

        token.value = savedToken

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token.value}` }
            })

            if (res.ok) {
                const data = await res.json()
                user.value = data.user
                console.log('authStore: session restored for', user.value?.username)
            } else if (res.status === 401) {
                // Access token expirat — intentar refresh silenciós
                console.log('authStore: access token expired, attempting silent refresh...')
                token.value = null
                await _tryBootstrapFromRefresh()
            } else {
                await _clearAll()
            }
        } catch (e) {
            console.error('Auth init failed:', e)
        }
    }

    // Helper privat: intentar login des del refresh token (sense user.value)
    // Usat en l'arrencada quan no tenim user.id encara.
    async function _tryBootstrapFromRefresh() {
        try {
            const refreshToken = await window.api.getRefreshToken()
            if (!refreshToken) {
                console.log('authStore: no refresh token, showing login screen')
                return
            }

            // Necessitem el userId del refresh token — el decodifiquem del payload
            // o usem un endpoint separat. Aquí usem /auth/refresh amb un userId
            // que hem d'obtenir. Alternativa: guardar el userId al disc.
            const savedUserId = localStorage.getItem('vertex_uid')
            if (!savedUserId) {
                console.log('authStore: no userId cached, cannot refresh without login')
                await _clearAll()
                return
            }

            const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken, userId: savedUserId })
            })

            if (!res.ok) {
                console.log('authStore: refresh failed, clearing session')
                await _clearAll()
                return
            }

            const { accessToken } = await res.json()
            token.value = accessToken
            await window.api.saveToken(accessToken)

            // Ara recuperem l'usuari amb el nou access token
            const meRes = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            })

            if (meRes.ok) {
                const data = await meRes.json()
                user.value = data.user
                console.log('authStore: silent refresh OK for', user.value?.username)
            } else {
                await _clearAll()
            }
        } catch (e) {
            console.error('Bootstrap from refresh failed:', e)
            await _clearAll()
        }
    }

    // ── LOGIN ─────────────────────────────────────────────────────────────────
    async function login(email: string, password: string) {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })

        if (!response.ok) throw new Error('Login failed')

        const data = await response.json()
        user.value = data.user
        token.value = data.accessToken

        // Guardar access token encriptat
        await window.api.saveToken(data.accessToken)
        // Guardar refresh token encriptat (separat)
        await window.api.saveRefreshToken(data.refreshToken)
        // Guardar userId per poder fer bootstrap sense credencials
        localStorage.setItem('vertex_uid', data.user.id)
    }

    // ── LOGOUT ────────────────────────────────────────────────────────────────
    async function logout() {
        // Notificar el servidor per invalidar el refresh token a Redis
        if (user.value?.id) {
            try {
                await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.value.id })
                })
            } catch (e) {
                console.error('Server logout failed (ignoring):', e)
            }
        }
        await _clearAll()
    }

    // ── HELPER PRIVAT ─────────────────────────────────────────────────────────
    async function _clearAll() {
        user.value = null
        token.value = null
        localStorage.removeItem('vertex_uid')
        await window.api.clearToken()
        await window.api.clearRefreshToken()
    }

    return { user, token, login, logout, init, refreshAccessToken }
})
