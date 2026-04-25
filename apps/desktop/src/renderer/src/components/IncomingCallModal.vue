<template>
  <Teleport to="body">
    <div
      v-if="callStore.callState === 'ringing-in'"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"
    >
      <div class="bg-[var(--v-bg-surface)] border border-[var(--v-border)] rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center space-y-6">
        <!-- Pulsing avatar -->
        <div class="flex justify-center">
          <div class="relative">
            <div class="absolute inset-0 rounded-full bg-[var(--v-accent)] opacity-20 animate-ping"></div>
            <div class="w-20 h-20 rounded-full bg-[var(--v-bg-base)] border-2 border-[var(--v-accent)] flex items-center justify-center text-2xl font-black text-[var(--v-accent)] relative">
              {{ callStore.callInfo?.peerName?.charAt(0).toUpperCase() ?? '?' }}
            </div>
          </div>
        </div>

        <div>
          <p class="text-[10px] font-black uppercase tracking-widest text-[var(--v-text-secondary)]">Incoming {{ callStore.callInfo?.callType }} call</p>
          <h2 class="text-2xl font-black text-white mt-1">{{ callStore.callInfo?.peerName }}</h2>
        </div>

        <div class="flex space-x-4">
          <!-- Reject -->
          <button
            @click="reject"
            class="flex-1 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
          >
            <svg class="inline mr-1" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08A.996.996 0 0 1 0 12.37c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.66c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
            Reject
          </button>
          <!-- Accept -->
          <button
            @click="accept"
            class="flex-1 py-3 rounded-2xl bg-[var(--v-accent)] text-[var(--v-bg-base)] font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[var(--v-accent-glow)]"
          >
            <svg class="inline mr-1" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
            Accept
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useCallStore } from '../stores/callStore'
import { useSocketStore } from '../stores/domain/socketStore'

const callStore = useCallStore()
const socketStore = useSocketStore()

function accept() {
  const socket = socketStore.getSocket()
  if (socket) callStore.acceptCall(socket)
}

function reject() {
  const socket = socketStore.getSocket()
  if (socket) callStore.rejectCall(socket)
}
</script>
