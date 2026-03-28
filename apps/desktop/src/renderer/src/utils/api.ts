/**
 * api.ts — Fetch wrapper amb retry automàtic en cas de 401.
 *
 * Substitueix els `fetch()` directes quan la petició requereix autenticació.
 * En cas de 401, intenta silenciosament refrescar el token i reintenta la petició.
 * Si el refresh falla, fa logout automàtic.
 *
 * Ús:
 *   import { apiFetch } from '../utils/api'
 *   const res = await apiFetch('/social/friends/123')
 */

import { useAuthStore } from '../stores/authStore'

const BASE_URL = import.meta.env.VITE_API_URL as string

export async function apiFetch(
    path: string,
    options: RequestInit = {}
): Promise<Response> {
    const authStore = useAuthStore()

    // Construir capçaleres amb el token actual
    const buildHeaders = (): HeadersInit => ({
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        ...(authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {})
    })

    // Primera petició
    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: buildHeaders()
    })

    // Si no és 401 → retornem directament
    if (res.status !== 401) return res

    // ── 401: Intentar refresh silenciós ──────────────────────────────────────
    console.log('apiFetch: 401 detected, attempting silent token refresh...')
    const refreshed = await authStore.refreshAccessToken()

    if (!refreshed) {
        // Refresh fallat → logout (la sessió ha expirat completament)
        console.log('apiFetch: refresh failed, logging out')
        await authStore.logout()
        return res // Retornem la resposta 401 original
    }

    // Reintent amb el nou Access Token
    console.log('apiFetch: token refreshed, retrying original request')
    return fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: buildHeaders()
    })
}
