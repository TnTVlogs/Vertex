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
        <h1 class="text-4xl font-black italic tracking-tighter text-white">VERTEX <span class="text-[var(--v-accent)] not-italic tracking-normal font-mono opacity-50">CORE</span></h1>
        <p class="text-[var(--v-text-secondary)] mt-2 text-xs font-bold uppercase tracking-[0.4em]">Integrated Subsystem</p>
      </div>

      <div class="glass p-10 rounded-3xl shadow-2xl relative overflow-hidden group">
        <!-- Error Display -->
        <div v-if="error" class="absolute top-0 left-0 right-0 bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-red-400 text-[10px] font-black uppercase tracking-widest text-center animate-in slide-in-from-top duration-300">
          {{ error }}
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-6 pt-4">
          <div v-if="!isLogin" class="space-y-1.5 group-input">
            <label class="block text-[10px] font-black text-[var(--v-text-secondary)] uppercase tracking-widest px-1">Username Handle</label>
            <input 
              v-model="username" 
              type="text" 
              placeholder="IDENTIFIER_01"
              class="w-full bg-[var(--v-bg-base)] border border-[var(--v-border)] rounded-2xl px-5 py-3.5 text-sm font-medium focus:border-[var(--v-accent)] outline-none transition-all placeholder-white/20" 
              required 
            />
          </div>
          
          <div class="space-y-1.5 group-input">
            <label class="block text-[10px] font-black text-[var(--v-text-secondary)] uppercase tracking-widest px-1">Email Endpoint</label>
            <input 
              v-model="email" 
              type="email" 
              placeholder="user@vertex.core"
              class="w-full bg-[var(--v-bg-base)] border border-[var(--v-border)] rounded-2xl px-5 py-3.5 text-sm font-medium focus:border-[var(--v-accent)] outline-none transition-all placeholder-white/20" 
              required 
            />
          </div>

          <div class="space-y-1.5 group-input">
            <label class="block text-[10px] font-black text-[var(--v-text-secondary)] uppercase tracking-widest px-1">Encryption Key</label>
            <input 
              v-model="password" 
              type="password" 
              placeholder="••••••••••••"
              class="w-full bg-[var(--v-bg-base)] border border-[var(--v-border)] rounded-2xl px-5 py-3.5 text-sm font-medium focus:border-[var(--v-accent)] outline-none transition-all placeholder-white/20" 
              required 
            />
          </div>

          <button type="submit" class="w-full vertex-gradient text-[var(--v-bg-base)] font-black py-4 rounded-2xl mt-4 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all text-xs tracking-[0.2em] uppercase">
            {{ isLogin ? 'INITIATE_UPLINK' : 'REGISTER_PROTOCOL' }}
          </button>
        </form>

        <div class="mt-8 pt-8 border-t border-white/5 text-center">
          <button @click="isLogin = !isLogin; error = ''" class="text-[10px] font-black text-[var(--v-text-secondary)] hover:text-[var(--v-accent)] uppercase tracking-widest transition-colors">
            {{ isLogin ? "Create New Node Profile" : "Existing Endpoint? Access Here" }}
          </button>
        </div>
      </div>

      <!-- System Status -->
      <div class="mt-8 flex items-center justify-center space-x-6">
        <div class="flex items-center space-x-2">
           <div class="w-1.5 h-1.5 bg-[var(--v-accent)] rounded-full animate-pulse shadow-[0_0_8px_var(--v-accent)]"></div>
           <span class="text-[9px] font-black text-[var(--v-text-secondary)] uppercase tracking-widest">Mainframe_Online</span>
        </div>
        <div class="flex items-center space-x-2 opacity-50">
           <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
           <span class="text-[9px] font-black text-[var(--v-text-secondary)] uppercase tracking-widest">v1.2.4-STABLE</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()
const isLogin = ref(true)
const username = ref('')
const email = ref('')
const password = ref('')
const error = ref('')

async function handleSubmit() {
  error.value = ''
  try {
    if (isLogin.value) {
      await authStore.login(email.value, password.value)
    } else {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.value, email: email.value, password: password.value })
      })
      if (response.ok) {
        isLogin.value = true
        error.value = 'Uplink Registered. Access Granted.'
      } else {
        const data = await response.json()
        error.value = data.error || 'Uplink Failed.'
      }
    }
  } catch (err: any) {
    error.value = err.message || 'System Interrupt Detected'
  }
}
</script>

<style scoped>
.group-input:focus-within label {
  color: var(--v-accent);
}
</style>
