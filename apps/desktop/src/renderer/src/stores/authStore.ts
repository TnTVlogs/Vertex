import { defineStore } from 'pinia'
import { ref } from 'vue'
import { User } from '@shared/models'

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | null>(null)
    const token = ref<string | null>(null)

    async function init() {
        console.log('authStore: init starting...');
        // Load encrypted token from Electron disk
        const savedToken = await window.api.loadToken();
        console.log('authStore: loaded from safeStorage:', savedToken ? 'YES' : 'NO');
        
        // Cleanup old localStorage token if it exists
        if (localStorage.getItem('token')) {
          console.log('authStore: removing stale localStorage token');
          localStorage.removeItem('token');
        }

        if (!savedToken) return
        token.value = savedToken;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token.value}` }
            })
            if (res.ok) {
                const data = await res.json()
                user.value = data.user
            } else {
                // Token expired or invalid — clear it
                token.value = null
                await window.api.clearToken();
            }
        } catch (e) {
            console.error('Auth init failed:', e)
        }
    }

    async function login(email: string, password: string) {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })

        if (response.ok) {
            const data = await response.json()
            user.value = data.user
            token.value = data.token
            await window.api.saveToken(data.token);
        } else {
            throw new Error('Login failed')
        }
    }

    async function logout() {
        user.value = null
        token.value = null
        await window.api.clearToken();
        localStorage.removeItem('token');
    }

    return { user, token, login, logout, init }
})
