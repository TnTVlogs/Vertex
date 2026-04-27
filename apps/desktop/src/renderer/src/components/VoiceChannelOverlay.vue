<template>
  <Teleport to="body">
    <div
      v-if="voiceStore.activeChannelId"
      ref="overlayRef"
      class="fixed z-[198] bg-[var(--v-bg-surface)] border border-[var(--v-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col select-none"
      :class="hasAnyVideo ? 'w-96' : 'w-56'"
    >
      <!-- Header (drag handle) -->
      <div class="px-4 py-2.5 border-b border-[var(--v-border)] flex items-center justify-between shrink-0 cursor-grab active:cursor-grabbing" @mousedown="startDrag">
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

        <!-- Quality selector -->
        <div class="relative">
          <button
            @click.stop="showQuality = !showQuality"
            title="Video quality"
            class="w-8 h-8 rounded-xl flex items-center justify-center transition-all bg-white/5 text-[var(--v-text-secondary)] hover:text-white"
            :class="voiceStore.isVideoOn ? 'opacity-100' : 'opacity-40 cursor-default'"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M3 9h4V5H3v4zm0 8h4v-4H3v4zm0-4h4v-4H3v4zm8 4h4v-4h-4v4zm4-8v-4h-4v4h4zm4 8h4v-4h-4v4zm-8-8v-4H7v4h4zm4 8h4v-4h-4v4zm0-16v4h4V5h-4zm-4 4H7v4h4V9zM3 5v4h4V5H3zm0 8h4v-4H3v4zm0 4h4v-4H3v4zm8 0h4v-4h-4v4zm4 0h4v-4h-4v4z"/></svg>
          </button>
          <div
            v-if="showQuality"
            class="absolute bottom-9 left-0 bg-[var(--v-bg-surface)] border border-[var(--v-border)] rounded-xl shadow-xl overflow-hidden z-10 w-28"
          >
            <button
              v-for="q in (['low', 'medium', 'high'] as const)"
              :key="q"
              @click="setQuality(q); showQuality = false"
              class="w-full px-3 py-1.5 text-left text-xs font-bold transition-all hover:bg-white/5 flex items-center space-x-2"
              :class="voiceStore.videoQuality === q ? 'text-[var(--v-accent)]' : 'text-[var(--v-text-secondary)]'"
            >
              <span>{{ q === 'low' ? '🔵' : q === 'medium' ? '🟡' : '🟢' }}</span>
              <span class="capitalize">{{ q }}</span>
            </button>
          </div>
        </div>

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
import { computed, ref, watch, watchEffect, onUnmounted, nextTick } from 'vue'
import { useVoiceChannelStore } from '../stores/voiceChannelStore'
import { useAuthStore } from '../stores/authStore'
import { useSocketStore } from '../stores/domain/socketStore'
import { useFriendStore } from '../stores/domain/friendStore'
import type { CallQuality } from '../utils/webrtc'

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
const showQuality = ref(false)

// ── Drag & corner snap ────────────────────────────────────────────────────────
type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
const overlayRef = ref<HTMLElement | null>(null)
const corner = ref<Corner>('bottom-left')
let isDragging = false
let dragOffsetX = 0, dragOffsetY = 0, lastX = 0, lastY = 0
const PAD = 24

function applyCorner(el: HTMLElement, c: Corner) {
    el.style.top = ''; el.style.left = ''; el.style.bottom = ''; el.style.right = ''
    switch (c) {
        case 'top-left':     el.style.top = `${PAD}px`;    el.style.left = `${PAD}px`; break
        case 'top-right':    el.style.top = `${PAD}px`;    el.style.right = `${PAD}px`; break
        case 'bottom-left':  el.style.bottom = `${PAD}px`; el.style.left = `${PAD}px`; break
        case 'bottom-right': el.style.bottom = `${PAD}px`; el.style.right = `${PAD}px`; break
    }
}

watch([() => voiceStore.activeChannelId, overlayRef], async ([active]) => {
    if (!active) return
    await nextTick()
    if (overlayRef.value) applyCorner(overlayRef.value, corner.value)
}, { immediate: true })

function startDrag(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('button')) return
    const el = overlayRef.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    dragOffsetX = e.clientX - rect.left
    dragOffsetY = e.clientY - rect.top
    lastX = rect.left; lastY = rect.top
    el.style.transition = 'none'
    el.style.bottom = ''; el.style.right = ''
    el.style.top = `${rect.top}px`; el.style.left = `${rect.left}px`
    isDragging = true
    window.addEventListener('mousemove', onDrag)
    window.addEventListener('mouseup', stopDrag)
    e.preventDefault()
}

function onDrag(e: MouseEvent) {
    if (!isDragging) return
    const el = overlayRef.value
    if (!el) return
    lastX = e.clientX - dragOffsetX; lastY = e.clientY - dragOffsetY
    el.style.left = `${lastX}px`; el.style.top = `${lastY}px`
}

function stopDrag() {
    if (!isDragging) return
    isDragging = false
    window.removeEventListener('mousemove', onDrag)
    window.removeEventListener('mouseup', stopDrag)
    const el = overlayRef.value
    if (!el) return
    const W = el.offsetWidth
    const cx = lastX + W / 2, cy = lastY
    const midX = window.innerWidth / 2, midY = window.innerHeight / 2
    let c: Corner
    if (cx < midX && cy < midY)       c = 'top-left'
    else if (cx >= midX && cy < midY) c = 'top-right'
    else if (cx < midX && cy >= midY) c = 'bottom-left'
    else                               c = 'bottom-right'
    corner.value = c
    el.style.transition = 'all 0.2s ease'
    applyCorner(el, c)
    setTimeout(() => { if (overlayRef.value) overlayRef.value.style.transition = '' }, 220)
}

onUnmounted(() => {
    window.removeEventListener('mousemove', onDrag)
    window.removeEventListener('mouseup', stopDrag)
})

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

async function setQuality(q: CallQuality) {
    await voiceStore.setVideoQuality(q)
}
</script>
