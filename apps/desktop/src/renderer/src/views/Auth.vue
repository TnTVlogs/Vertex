<template>
  <div class="relative flex items-center justify-center min-h-screen bg-[var(--v-bg-base)] text-white overflow-hidden p-6 selection:bg-[var(--v-accent)] selection:text-[var(--v-bg-base)]">
    <!-- Dynamic Background Accents -->
    <div class="absolute top-0 right-0 w-[40%] h-[40%] bg-[var(--v-accent)] opacity-[0.05] blur-[120px] rounded-full"></div>
    <div class="absolute -bottom-[10%] -left-[10%] w-[50%] h-[50%] bg-[var(--v-accent)] opacity-[0.08] blur-[150px] rounded-full"></div>
    
    <!-- Auth Card -->
    <div class="w-full max-w-[440px] z-10 animate-in fade-in zoom-in duration-700">
      <!-- Logo Branding -->
      <div class="text-center mb-10">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl vertex-gradient shadow-[0_0_30px_var(--v-accent-glow)] mb-6 rotate-3">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="var(--v-bg-base)">
            <path d="M13 2L3 14h9l-1 8L21 10h-9l1-8z"/>
          </svg>
        </div>
        <h1 class="text-4xl font-black italic tracking-tighter text-white">{{ i18n.t('auth.welcome') }} <span class="text-[var(--v-accent)] not-italic tracking-normal font-mono opacity-50">{{ i18n.t('auth.welcomesub') }}</span></h1>
        <p class="text-[var(--v-text-secondary)] mt-2 text-xs font-bold uppercase tracking-[0.4em]">{{ i18n.t('auth.subtitle') }}</p>
      </div>

      <div class="glass p-10 rounded-3xl shadow-2xl relative overflow-hidden group">
        <!-- Error Display -->
        <div v-if="error" class="absolute top-0 left-0 right-0 bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-red-400 text-[10px] font-black uppercase tracking-widest text-center animate-in slide-in-from-top duration-300">
          {{ error }}
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-6 pt-4">
          <div v-if="!isLogin" class="space-y-1.5 group-input">
            <label class="block text-[10px] font-black text-[var(--v-text-secondary)] uppercase tracking-widest px-1">{{ i18n.t('auth.username') }}</label>
            <input 
              v-model="username" 
              type="text" 
              placeholder="IDENTIFIER_01"
              class="w-full bg-[var(--v-bg-base)] border border-[var(--v-border)] rounded-2xl px-5 py-3.5 text-sm font-medium focus:border-[var(--v-accent)] outline-none transition-all placeholder-white/20" 
              required 
            />
          </div>
          
          <div class="space-y-1.5 group-input">
            <label class="block text-[10px] font-black text-[var(--v-text-secondary)] uppercase tracking-widest px-1">{{ i18n.t('auth.email') }}</label>
            <input 
              v-model="email" 
              type="email" 
              placeholder="user@vertex.core"
              class="w-full bg-[var(--v-bg-base)] border border-[var(--v-border)] rounded-2xl px-5 py-3.5 text-sm font-medium focus:border-[var(--v-accent)] outline-none transition-all placeholder-white/20" 
              required 
            />
          </div>

          <div class="space-y-1.5 group-input">
            <label class="block text-[10px] font-black text-[var(--v-text-secondary)] uppercase tracking-widest px-1">{{ i18n.t('auth.password') }}</label>
            <input 
              v-model="password" 
              type="password" 
              placeholder="••••••••••••"
              class="w-full bg-[var(--v-bg-base)] border border-[var(--v-border)] rounded-2xl px-5 py-3.5 text-sm font-medium focus:border-[var(--v-accent)] outline-none transition-all placeholder-white/20" 
              required 
            />
          </div>

          <button 
            type="submit" 
            :disabled="isLoading"
            class="w-full vertex-gradient text-[var(--v-bg-base)] font-black py-4 rounded-2xl mt-4 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all text-xs tracking-[0.2em] uppercase disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
          >
            <span v-if="isLoading" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-[var(--v-bg-base)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
            <span v-else>
              {{ isLogin ? i18n.t('auth.login_btn') : i18n.t('auth.register_btn') }}
            </span>
          </button>
        </form>

        <div class="mt-8 pt-8 border-t border-white/5 text-center">
          <button @click="isLogin = !isLogin; error = ''" class="text-[10px] font-black text-[var(--v-text-secondary)] hover:text-[var(--v-accent)] uppercase tracking-widest transition-colors">
            {{ isLogin ? i18n.t('auth.switch_register') : i18n.t('auth.switch_login') }}
          </button>
        </div>
      </div>

      <!-- System Status -->
      <div class="mt-8 flex items-center justify-center space-x-6">
        <div class="flex items-center space-x-2">
           <div class="w-1.5 h-1.5 bg-[var(--v-accent)] rounded-full animate-pulse shadow-[0_0_8px_var(--v-accent)]"></div>
           <span class="text-[9px] font-black text-[var(--v-text-secondary)] uppercase tracking-widest">{{ i18n.t('auth.status_online') }}</span>
        </div>
        <div class="flex items-center space-x-2 opacity-50">
           <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
           <span class="text-[9px] font-black text-[var(--v-text-secondary)] uppercase tracking-widest">v{{ appVersion }}-STABLE</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useI18nStore } from '../stores/i18nStore'
import { ENV } from '../utils/env'
import pkg from '../../../../package.json'

const authStore = useAuthStore()
const i18n = useI18nStore()
const appVersion = pkg.version
const isLogin = ref(true)
const isLoading = ref(false)
const username = ref('')
const email = ref('')
const password = ref('')
const error = ref('')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(): string {
  if (!isLogin.value && username.value.trim().length < 3)
    return 'Username must be at least 3 characters'
  if (!EMAIL_RE.test(email.value.trim()))
    return 'Invalid email format'
  if (password.value.length < 8)
    return 'Password must be at least 8 characters'
  return ''
}

async function handleSubmit() {
  if (isLoading.value) return
  const validationError = validate()
  if (validationError) {
    error.value = validationError
    return
  }
  error.value = ''
  isLoading.value = true
  try {
    if (isLogin.value) {
      await authStore.login(email.value, password.value)
    } else {
      const response = await fetch(`${ENV.API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.value, email: email.value, password: password.value })
      })
      if (response.ok) {
        isLogin.value = true
        error.value = i18n.t('auth.success_register')
      } else {
        const data = await response.json()
        error.value = data.error || i18n.t('auth.error_failed')
      }
    }

    // [MOD] RedirecciÃ³ d'Invitacions Pendent
    if (isLogin.value && !error.value) {
      const pendingInvite = localStorage.getItem('vertex_pending_invite')
      if (pendingInvite) {
        localStorage.removeItem('vertex_pending_invite')
        window.location.hash = `/invite/${pendingInvite}`
      }
    }
  } catch (err: any) {
    error.value = err.message || i18n.t('auth.error_failed')
  } finally {
    isLoading.value = false
  }
}

</script>

<style scoped>
.group-input:focus-within label {
  color: var(--v-accent);
}
</style>
