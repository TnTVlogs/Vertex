<template>
  <Teleport to="body">
    <div
      v-if="voiceStore.activeChannelId"
      class="fixed bottom-6 left-6 z-[198] bg-[var(--v-bg-surface)] border border-[var(--v-border)] rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 flex flex-col"
      :class="hasAnyVideo ? 'w-96' : 'w-56'"
    >
      <!-- Header -->
      <div class="px-4 py-2.5 border-b border-[var(--v-border)] flex items-center justify-between shrink-0">
        <div class="flex items-center space-x-2">
          <div class="w-2 h-2 rounded-full bg-[var(--v-accent)] animate-pulse"></div>
          <span class="text-xs font-black text-white uppercase tracking-wider">Voice</span>
        </div>
        <span class="text-[9px] text-[var(--v-text-secondary)] font-mono">
          {{ voiceStore.peers.size + 1 }} connected
        </span>
      </div>

      <!-- Video Grid -->
      <div v-if="hasAnyVideo" class="p-2 grid gap-1.5" :class="videoTileCount <= 1 ? 'grid-cols-1' : 'grid-cols-2'">
        <!-- Local video tile -->
        <div
          v-if="voiceStore.isVideoOn || voiceStore.isScreenSharing"
          class="relative rounded-xl overflow-hidden bg-zinc-900 aspect-video transition-all"
          :class="voiceStore.isSpeaking ? 'ring-2 ring-[var(--v-accent)]' : 'ring-1 ring-white/10'"
        >
          <video ref="localVideoEl" autoplay muted playsinline class="w-full h-full object-cover" />
          <div class="absolute bottom-1 left-1.5 flex items-center space-x-1">
            <span class="text-[8px] font-black text-white bg-black/70 px-1.5 py-0.5 rounded-md">
              {{ authStore.user?.displayName || authStore.user?.username }}
            </span>
            <svg v-if="voiceStore.isScreenSharing" viewBox="0 0 24 24" width="10" height="10" fill="currentColor" class="text-[var(--v-accent)]"><path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/></svg>
          </div>
        </div>

        <!-- Remote video tiles (max 4 total including local) -->
        <template v-for="[peerId, peer] in voiceStore.peers" :key="peerId">
          <div
            v-if="peer.stream && peer.stream.getVideoTracks().length > 0"
            class="relative rounded-xl overflow-hidden bg-zinc-900 aspect-video transition-all"
            :class="voiceStore.speakingUsers.has(peerId) ? 'ring-2 ring-[var(--v-accent)]' : 'ring-1 ring-white/10'"
          >
            <video autoplay playsinline v-src-object="peer.stream" class="w-full h-full object-cover" />
            <div class="absolute bottom-1 left-1.5">
              <span class="text-[8px] font-black text-white bg-black/70 px-1.5 py-0.5 rounded-md">
                {{ resolveName(peerId) }}
              </span>
            </div>
          </div>
        </template>
      </div>

      <!-- Participants List -->
      <div class="px-3 py-2 space-y-1 max-h-36 overflow-y-auto">
        <!-- Local user -->
        <div class="flex items-center space-x-2">
          <div
            class="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0 transition-all"
            :class="voiceStore.isSpeaking ? 'bg-[var(--v-accent)]/30 ring-1 ring-[var(--v-accent)]' : 'bg-[var(--v-accent)]/20'"
          >
            <span class="text-[var(--v-accent)]">{{ authStore.user?.username?.charAt(0).toUpperCase() }}</span>
          </div>
          <span class="text-xs font-bold text-white flex-1 truncate">{{ authStore.user?.displayName || authStore.user?.username }}</span>
          <svg v-if="voiceStore.isMuted" viewBox="0 0 24 24" width="11" height="11" fill="currentColor" class="text-red-400 shrink-0">
            <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V20c0 .55.45 1 1 1s1-.45 1-1v-2.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
          </svg>
          <svg v-if="voiceStore.isVideoOn || voiceStore.isScreenSharing" viewBox="0 0 24 24" width="11" height="11" fill="currentColor" class="text-[var(--v-accent)] shrink-0">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
          </svg>
        </div>

        <!-- Remote peers -->
        <div v-for="[peerId, peer] in voiceStore.peers" :key="peerId" class="flex items-center space-x-2">
          <audio autoplay v-src-object="peer.stream" />
          <div
            class="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0 transition-all"
            :class="voiceStore.speakingUsers.has(peerId) ? 'bg-white/20 ring-1 ring-[var(--v-accent)]' : 'bg-white/10'"
          >
            <span class="text-white">{{ resolveName(peerId).charAt(0).toUpperCase() }}</span>
          </div>
          <span class="text-xs font-bold text-[var(--v-text-secondary)] flex-1 truncate">{{ resolveName(peerId) }}</span>
          <svg v-if="peer.stream && peer.stream.getVideoTracks().length > 0" viewBox="0 0 24 24" width="11" height="11" fill="currentColor" class="text-[var(--v-accent)] shrink-0">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
          </svg>
        </div>
      </div>

      <!-- Controls -->
      <div class="px-3 py-2 border-t border-[var(--v-border)] flex items-center gap-1.5 shrink-0">
        <!-- Mute -->
        <button
          @click="voiceStore.toggleMute()"
          title="Toggle mute"
          class="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
          :class="voiceStore.isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-[var(--v-text-secondary)] hover:text-white'"
        >
          <svg v-if="!voiceStore.isMuted" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>
          <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V20c0 .55.45 1 1 1s1-.45 1-1v-2.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>
        </button>

        <!-- Camera -->
        <button
          @click="toggleCamera()"
          title="Toggle camera"
          class="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
          :class="voiceStore.isVideoOn ? 'bg-[var(--v-accent)]/20 text-[var(--v-accent)]' : 'bg-white/5 text-[var(--v-text-secondary)] hover:text-white'"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
        </button>

        <!-- Screen share -->
        <button
          @click="toggleScreen()"
          title="Toggle screen share"
          class="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
          :class="voiceStore.isScreenSharing ? 'bg-[var(--v-accent)]/20 text-[var(--v-accent)]' : 'bg-white/5 text-[var(--v-text-secondary)] hover:text-white'"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/></svg>
        </button>

        <div class="flex-1" />

        <!-- Leave -->
        <button
          @click="leave()"
          class="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest transition-all"
        >
          Leave
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useVoiceChannelStore } from '../stores/voiceChannelStore'
import { useAuthStore } from '../stores/authStore'
import { useSocketStore } from '../stores/domain/socketStore'
import { useFriendStore } from '../stores/domain/friendStore'

// Vue doesn't reliably set srcObject as a DOM property via :srcObject binding
const vSrcObject = {
    mounted(el: HTMLMediaElement, { value }: { value: MediaStream | null }) {
        el.srcObject = value ?? null
    },
    updated(el: HTMLMediaElement, { value }: { value: MediaStream | null }) {
        if (el.srcObject !== value) el.srcObject = value ?? null
    },
}

const voiceStore = useVoiceChannelStore()
const authStore = useAuthStore()
const socketStore = useSocketStore()
const friendStore = useFriendStore()

const localVideoEl = ref<HTMLVideoElement | null>(null)

watchEffect(() => {
    if (localVideoEl.value) localVideoEl.value.srcObject = voiceStore.localVideoStream
})

const hasAnyVideo = computed(() => {
    if (voiceStore.isVideoOn || voiceStore.isScreenSharing) return true
    return [...voiceStore.peers.values()].some(p => (p.stream?.getVideoTracks().length ?? 0) > 0)
})

const videoTileCount = computed(() => {
    let count = (voiceStore.isVideoOn || voiceStore.isScreenSharing) ? 1 : 0
    for (const peer of voiceStore.peers.values()) {
        if ((peer.stream?.getVideoTracks().length ?? 0) > 0) count++
    }
    return count
})

function resolveName(userId: string): string {
    const f = friendStore.friends.find((fr: any) => fr.id === userId)
    return f?.displayName ?? f?.username ?? userId.slice(0, 8)
}

async function toggleCamera() {
    const socket = socketStore.getSocket()
    if (socket) await voiceStore.toggleCamera(socket)
}

async function toggleScreen() {
    const socket = socketStore.getSocket()
    if (socket) await voiceStore.toggleScreenShare(socket)
}

async function leave() {
    const socket = socketStore.getSocket()
    if (socket) await voiceStore.leaveChannel(socket)
}
</script>
