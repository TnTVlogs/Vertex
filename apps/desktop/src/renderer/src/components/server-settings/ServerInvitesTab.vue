<template>
  <section class="space-y-8 animate-in slide-in-from-right-4 duration-500">
    <h1 class="text-2xl font-black text-white uppercase italic tracking-tighter">Access Protocols</h1>

    <div class="p-8 rounded-3xl bg-[var(--v-bg-sidebar)] border border-[var(--v-border)] flex flex-col items-center text-center space-y-6">
      <div class="w-16 h-16 rounded-2xl vertex-gradient flex items-center justify-center text-[var(--v-bg-base)] shadow-xl">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
      </div>

      <div v-if="serverStore.currentServer?.inviteCode" class="w-full space-y-4">
        <div class="flex items-center justify-between">
          <p class="text-xs font-bold text-[var(--v-text-secondary)] uppercase tracking-[0.2em]">Active Uplink Path</p>
          <span
            class="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg"
            :class="isExpired(serverStore.currentServer?.inviteExpiresAt)
              ? 'bg-red-500/10 text-red-500'
              : serverStore.currentServer?.inviteExpiresAt
                ? 'bg-[var(--v-accent)]/10 text-[var(--v-accent)]'
                : 'bg-white/5 text-[var(--v-text-secondary)]'"
          >
            {{ formatTimeRemaining(serverStore.currentServer?.inviteExpiresAt) }}
          </span>
        </div>
        <div class="flex items-center bg-[var(--v-bg-surface)] p-2 rounded-2xl border border-[var(--v-border)]">
          <span class="flex-1 px-4 text-sm font-mono text-[var(--v-accent)] truncate">{{ inviteLink }}</span>
          <button @click="copyInvite" class="px-4 py-2 bg-[var(--v-accent)] text-[var(--v-bg-base)] font-black text-[10px] rounded-xl uppercase shadow-lg">Copy</button>
        </div>
        <div class="flex items-center space-x-3">
          <span class="text-[10px] font-bold uppercase text-[var(--v-text-secondary)]">Regenerate with expiry:</span>
          <select v-model="selectedExpiry" class="bg-[var(--v-bg-surface)] border border-[var(--v-border)] rounded-lg px-2 py-1 text-[10px] font-bold uppercase outline-none text-white">
            <option :value="1">1 Day</option>
            <option :value="7">7 Days</option>
            <option :value="30">30 Days</option>
            <option :value="null">Never</option>
          </select>
        </div>
        <div class="flex items-center justify-center space-x-4">
          <button @click="handleGenerateInvite" class="text-[10px] font-black uppercase text-[var(--v-accent)] hover:underline">Regenerate Link</button>
          <span class="text-[var(--v-border)]">|</span>
          <button @click="handleRevokeInvite" class="text-[10px] font-black uppercase text-red-500 hover:underline">Revoke and Terminate</button>
        </div>
      </div>

      <div v-else class="space-y-4">
        <p class="text-xs text-[var(--v-text-secondary)]">No active invitation protocol found for this server.</p>
        <div class="flex items-center justify-center space-x-3">
          <span class="text-[10px] font-bold uppercase text-[var(--v-text-secondary)]">Expires after:</span>
          <select v-model="selectedExpiry" class="bg-[var(--v-bg-surface)] border border-[var(--v-border)] rounded-lg px-2 py-1 text-[10px] font-bold uppercase outline-none text-white">
            <option :value="1">1 Day</option>
            <option :value="7">7 Days</option>
            <option :value="30">30 Days</option>
            <option :value="null">Never</option>
          </select>
        </div>
        <button @click="handleGenerateInvite" class="px-8 py-3 bg-[var(--v-accent)] text-[var(--v-bg-base)] font-black text-xs rounded-2xl uppercase shadow-xl hover:scale-105 active:scale-95 transition-all">
          Initialize Invitation Protocol
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useServerStore } from '../../stores/domain/serverStore'
import { useToastStore } from '../../stores/toastStore'

const serverStore = useServerStore()
const toastStore = useToastStore()

const selectedExpiry = ref<number | null>(7)

const inviteLink = computed(() => {
  const code = serverStore.currentServer?.inviteCode
  return code ? `https://vertex.sergidalmau.dev/#/invite/${code}` : ''
})

function formatTimeRemaining(expiresAt: string | null | undefined): string {
  if (!expiresAt) return 'Never expires'
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return 'Expired'
  const days = Math.floor(ms / 86400000)
  const hours = Math.floor((ms % 86400000) / 3600000)
  if (days > 0) return `Expires in ${days}d ${hours}h`
  const minutes = Math.floor((ms % 3600000) / 60000)
  if (hours > 0) return `Expires in ${hours}h ${minutes}m`
  return `Expires in ${minutes}m`
}

function isExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() < Date.now()
}

async function handleGenerateInvite() {
  await serverStore.generateInvite(serverStore.currentServer!.id, selectedExpiry.value)
  toastStore.addToast('New uplink matrix generated', 'success')
}

async function handleRevokeInvite() {
  await serverStore.revokeInvite(serverStore.currentServer!.id)
  toastStore.addToast('Uplink matrix revoked securely', 'info')
}

function copyInvite() {
  if (!inviteLink.value) return
  navigator.clipboard.writeText(inviteLink.value)
  toastStore.addToast('Uplink identifier copied to clipboard', 'success')
}
</script>
