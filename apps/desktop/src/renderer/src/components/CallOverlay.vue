<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed bottom-6 right-6 z-[199] w-72 bg-[var(--v-bg-surface)] border border-[var(--v-border)] rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
    >
      <!-- Audio elements (always hidden) -->
      <audio ref="localAudio" autoplay muted :srcObject="callStore.localStream ?? undefined" />
      <audio ref="remoteAudio" autoplay :srcObject="callStore.remoteStream ?? undefined" />

      <!-- Remote video (when peer has video) -->
      <div v-if="hasRemoteVideo" class="relative bg-black w-full aspect-video">
        <video
          ref="remoteVideo"
          autoplay
          playsinline
          class="w-full h-full object-contain"
          :srcObject="callStore.remoteStream ?? undefined"
        />
        <!-- Local PiP preview -->
        <div v-if="callStore.isVideoOn" class="absolute bottom-2 right-2 w-20 aspect-video bg-black rounded-lg overflow-hidden border border-white/20">
          <video
            ref="localVideo"
            autoplay
            playsinline
            muted
            class="w-full h-full object-cover"
            :srcObject="callStore.localStream ?? undefined"
          />
        </div>
      </div>

      <!-- Header -->
      <div class="px-4 py-3 border-b border-[var(--v-border)] flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded-xl bg-[var(--v-accent)]/10 flex items-center justify-center text-xs font-black text-[var(--v-accent)]">
            {{ callStore.callInfo?.peerName?.charAt(0).toUpperCase() ?? '?' }}
          </div>
          <div>
            <p class="text-sm font-black text-white leading-none">{{ callStore.callInfo?.peerName }}</p>
            <p class="text-[9px] font-bold uppercase tracking-widest mt-0.5" :class="statusColor">{{ statusLabel }}</p>
          </div>
        </div>
        <span v-if="callStore.callState === 'active'" class="text-xs font-mono text-[var(--v-text-secondary)]">{{ timer }}</span>
      </div>

      <!-- Controls -->
      <div class="px-4 py-3 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <!-- Mute mic -->
          <button
            @click="callStore.toggleMute()"
            class="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            :class="callStore.isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-[var(--v-text-secondary)] hover:bg-white/10 hover:text-white'"
            title="Toggle mute"
          >
            <svg v-if="!callStore.isMuted" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>
            <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V20c0 .55.45 1 1 1s1-.45 1-1v-2.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>
          </button>

          <!-- Camera -->
          <button
            v-if="callStore.callState === 'active'"
            @click="toggleCamera"
            class="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            :class="callStore.isVideoOn ? 'bg-[var(--v-accent)]/20 text-[var(--v-accent)]' : 'bg-white/5 text-[var(--v-text-secondary)] hover:bg-white/10 hover:text-white'"
            title="Toggle camera"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
          </button>

          <!-- Screen share -->
          <button
            v-if="callStore.callState === 'active'"
            @click="toggleScreen"
            class="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            :class="callStore.isScreenSharing ? 'bg-[var(--v-accent)]/20 text-[var(--v-accent)]' : 'bg-white/5 text-[var(--v-text-secondary)] hover:bg-white/10 hover:text-white'"
            title="Share screen"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h3l-1 1v1h12v-1l-1-1h3c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 13H4V5h16v11z"/></svg>
          </button>
        </div>

        <!-- End call -->
        <button
          @click="end"
          class="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
        >
          End
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { useCallStore } from '../stores/callStore'
import { useSocketStore } from '../stores/domain/socketStore'

const callStore = useCallStore()
const socketStore = useSocketStore()

const visible = computed(() =>
    callStore.callState === 'connecting' || callStore.callState === 'active' || callStore.callState === 'ringing-out'
)

const hasRemoteVideo = computed(() => {
    if (!callStore.remoteStream) return false
    return callStore.remoteStream.getVideoTracks().some(t => t.enabled && t.readyState === 'live')
})

const statusLabel = computed(() => {
    switch (callStore.callState) {
        case 'ringing-out': return 'Calling...'
        case 'connecting': return 'Connecting...'
        case 'active': return 'In call'
        default: return ''
    }
})

const statusColor = computed(() =>
    callStore.callState === 'active' ? 'text-[var(--v-accent)]' : 'text-[var(--v-text-secondary)]'
)

const seconds = ref(0)
let timerInterval: ReturnType<typeof setInterval> | null = null

const timer = computed(() => {
    const m = Math.floor(seconds.value / 60).toString().padStart(2, '0')
    const s = (seconds.value % 60).toString().padStart(2, '0')
    return `${m}:${s}`
})

watch(() => callStore.callState, (state) => {
    if (state === 'active') {
        seconds.value = 0
        timerInterval = setInterval(() => { seconds.value++ }, 1000)
    } else {
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
    }
})

onUnmounted(() => {
    if (timerInterval) clearInterval(timerInterval)
})

function end() {
    const socket = socketStore.getSocket()
    if (socket) callStore.endCall(socket)
}

async function toggleCamera() {
    const socket = socketStore.getSocket()
    if (socket) await callStore.toggleCamera(socket)
}

async function toggleScreen() {
    const socket = socketStore.getSocket()
    if (socket) await callStore.toggleScreenShare(socket)
}
</script>
