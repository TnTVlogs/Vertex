<template>
  <div class="flex-1 flex flex-col p-8 z-10 overflow-hidden bg-[var(--v-bg-base)]">
    <!-- Header -->
    <div class="flex items-baseline justify-between mb-8">
      <h3 class="text-2xl font-black text-[var(--v-text-primary)] tracking-tight italic uppercase">Configurations</h3>
    </div>

    <div class="flex-1 overflow-y-auto no-scrollbar space-y-8 max-w-2xl">
      <!-- Profile Context Box -->
      <section class="p-6 bg-[var(--v-bg-surface)]/50 rounded-3xl border border-[var(--v-border)]">
        <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--v-text-secondary)] mb-4">Uplink Identifier</h4>
        <div class="flex items-center space-x-4">
          <div class="relative w-16 h-16 rounded-2xl bg-[var(--v-bg-base)] flex items-center justify-center text-2xl font-black border border-[var(--v-border)] shadow-inner text-[var(--v-text-primary)]">
            {{ authStore.user?.username?.charAt(0).toUpperCase() }}
          </div>
          <div class="flex flex-col">
            <span class="text-xl font-black text-[var(--v-text-primary)]">{{ authStore.user?.username }}</span>
            <span class="text-xs font-bold text-[var(--v-text-secondary)]">{{ authStore.user?.email }}</span>
          </div>
        </div>
      </section>

      <!-- Appearance Component -->
      <section class="p-6 bg-[var(--v-bg-surface)]/50 rounded-3xl border border-[var(--v-border)]">
        <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--v-text-secondary)] mb-6">Visual Theme</h4>
        
        <div class="grid grid-cols-2 gap-4">
          <!-- Dark Theme Toggle -->
          <button 
            @click="settingsStore.setTheme('dark')"
            class="group relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all cursor-pointer"
            :class="settingsStore.theme === 'dark' ? 'border-[var(--v-accent)] bg-[var(--v-accent)]/10 shadow-[0_0_20px_var(--v-accent-glow)]' : 'border-[var(--v-border)] bg-[var(--v-bg-base)] hover:border-[var(--v-text-secondary)]'"
          >
            <div class="w-full h-24 rounded-lg bg-[#0a0a0a] border border-[#141414] mb-4 overflow-hidden relative shadow-inner">
               <div class="absolute top-2 left-2 w-1/3 h-2 bg-[#141414] rounded-full"></div>
               <div class="absolute top-6 left-2 w-3/4 h-8 bg-[#141414] rounded-lg"></div>
               <div class="absolute bottom-2 right-2 w-4 h-4 bg-[#10B981] rounded-full"></div>
            </div>
            <span class="font-bold text-sm" :class="settingsStore.theme === 'dark' ? 'text-[var(--v-accent)]' : 'text-[var(--v-text-primary)]'">Dark Protocol</span>
            <div v-if="settingsStore.theme === 'dark'" class="absolute -top-3 -right-3 w-6 h-6 bg-[var(--v-accent)] text-[#0a0a0a] rounded-full flex items-center justify-center shadow-lg">
               <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            </div>
          </button>

          <!-- Light Theme Toggle -->
          <button 
            @click="settingsStore.setTheme('light')"
            class="group relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all cursor-pointer"
            :class="settingsStore.theme === 'light' ? 'border-[var(--v-accent)] bg-[var(--v-accent)]/10 shadow-[0_0_20px_var(--v-accent-glow)]' : 'border-[var(--v-border)] bg-[var(--v-bg-base)] hover:border-[var(--v-text-secondary)]'"
          >
            <div class="w-full h-24 rounded-lg bg-[#f7f7f8] border border-[#ebecf0] mb-4 overflow-hidden relative shadow-inner">
               <div class="absolute top-2 left-2 w-1/3 h-2 bg-[#ebecf0] rounded-full"></div>
               <div class="absolute top-6 left-2 w-3/4 h-8 bg-[#ffffff] rounded-lg border border-[#e2e2e5]"></div>
               <div class="absolute bottom-2 right-2 w-4 h-4 bg-[#10B981] rounded-full"></div>
            </div>
            <span class="font-bold text-sm" :class="settingsStore.theme === 'light' ? 'text-[var(--v-accent)]' : 'text-[var(--v-text-primary)]'">Light Protocol</span>
            <div v-if="settingsStore.theme === 'light'" class="absolute -top-3 -right-3 w-6 h-6 bg-[var(--v-accent)] text-white rounded-full flex items-center justify-center shadow-lg">
               <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            </div>
          </button>
        </div>
      </section>

      <!-- Placeholder System Information -->
      <section class="p-6">
        <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--v-text-secondary)] mb-4">Diagnostics</h4>
        <div class="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500">
          <span class="text-xs font-bold tracking-widest uppercase">System Core Version</span>
          <span class="text-xs font-mono font-black">v1.2.4-STABLE</span>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'

const authStore = useAuthStore()
const settingsStore = useSettingsStore()
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
