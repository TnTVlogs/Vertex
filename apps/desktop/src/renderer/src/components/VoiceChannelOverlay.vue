<template>
  <Teleport to="body">
    <div
      v-if="voiceStore.activeChannelId"
      class="fixed bottom-6 left-6 z-[198] bg-[var(--v-bg-surface)] border border-[var(--v-border)] rounded-2xl shadow-2xl overflow-hidden w-56 animate-in slide-in-from-bottom-4 duration-300"
    >
      <!-- Header -->
      <div class="px-4 py-2.5 border-b border-[var(--v-border)] flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <div class="w-2 h-2 rounded-full bg-[var(--v-accent)] animate-pulse"></div>
          <span class="text-xs font-black text-white uppercase tracking-wider">Voice</span>
        </div>
        <span class="text-[9px] text-[var(--v-text-secondary)] font-mono">
          {{ voiceStore.peers.size + 1 }} connected
        </span>
      </div>

      <!-- Participants -->
      <div class="px-3 py-2 space-y-1 max-h-40 overflow-y-auto">
        <!-- Local user -->
        <div class="flex items-center space-x-2">
          <div class="w-6 h-6 rounded-lg bg-[var(--v-accent)]/20 flex items-center justify-center text-[9px] font-black text-[var(--v-accent)]">
            {{ authStore.user?.username?.charAt(0).toUpperCase() }}
          </div>
          <span class="text-xs font-bold text-white flex-1 truncate">{{ authStore.user?.displayName || authStore.user?.username }}</span>
          <svg v-if="voiceStore.isMuted" viewBox="0 0 24 24" width="12" height="12" fill="currentColor" class="text-red-400 shrink-0">
            <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V20c0 .55.45 1 1 1s1-.45 1-1v-2.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
          </svg>
        </div>

        <!-- Remote peers -->
        <div v-for="[peerId, peer] in voiceStore.peers" :key="peerId" class="flex items-center space-x-2">
          <audio autoplay :srcObject="peer.stream ?? undefined" />
          <div class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[9px] font-black text-white">
            {{ resolveName(peerId).charAt(0).toUpperCase() }}
          </div>
          <span class="text-xs font-bold text-[var(--v-text-secondary)] flex-1 truncate">{{ resolveName(peerId) }}</span>
        </div>
      </div>

      <!-- Controls -->
      <div class="px-3 py-2 border-t border-[var(--v-border)] flex items-center justify-between">
        <button
          @click="voiceStore.toggleMute()"
          class="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
          :class="voiceStore.isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-[var(--v-text-secondary)] hover:text-white'"
        >
          <svg v-if="!voiceStore.isMuted" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>
          <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V20c0 .55.45 1 1 1s1-.45 1-1v-2.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>
        </button>

        <button
          @click="leave"
          class="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest transition-all"
        >
          Leave
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useVoiceChannelStore } from '../stores/voiceChannelStore'
import { useAuthStore } from '../stores/authStore'
import { useSocketStore } from '../stores/domain/socketStore'
import { useFriendStore } from '../stores/domain/friendStore'

const voiceStore = useVoiceChannelStore()
const authStore = useAuthStore()
const socketStore = useSocketStore()
const friendStore = useFriendStore()

function resolveName(userId: string): string {
    const f = friendStore.friends.find((fr: any) => fr.id === userId)
    return f?.displayName ?? f?.username ?? userId.slice(0, 8)
}

async function leave() {
    const socket = socketStore.getSocket()
    if (socket) await voiceStore.leaveChannel(socket)
}
</script>
