<template>
  <Teleport to="body">
    <!-- Reconnect banner -->
    <div
      v-if="interruptedCall && !visible"
      class="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-[var(--v-bg-surface)] border border-[var(--v-accent)]/40 rounded-xl px-4 py-3 flex items-center space-x-3 shadow-xl"
    >
      <span class="text-xs font-bold text-[var(--v-accent)]">Call interrupted</span>
      <span class="text-xs text-[var(--v-text-secondary)]">with {{ interruptedCall.peerName }}</span>
      <button @click="reconnect" class="px-3 py-1 rounded-lg bg-[var(--v-accent)]/20 text-[var(--v-accent)] text-xs font-black hover:bg-[var(--v-accent)]/40 transition-all">Reconnect</button>
      <button @click="interruptedCall = null" class="text-[var(--v-text-secondary)] hover:text-white text-xs">✕</button>
    </div>

    <div
      v-if="visible"
      ref="overlayRef"
      class="fixed z-[199] w-72 bg-[var(--v-bg-surface)] border border-[var(--v-border)] rounded-2xl shadow-2xl overflow-hidden select-none"
    >
      <!-- Audio elements (always hidden) -->
      <audio ref="localAudio" autoplay muted v-src-object="callStore.localStream ?? null" />
      <audio ref="remoteAudio" autoplay v-src-object="callStore.remoteStream ?? null" />

      <!-- Remote video (when peer has video) -->
      <div v-if="hasRemoteVideo && !isMinimized" class="relative bg-black w-full aspect-video">
        <video
          ref="remoteVideo"
          autoplay
          playsinline
          class="w-full h-full object-contain"
          v-src-object="callStore.remoteStream ?? null"
        />
        <div v-if="callStore.isVideoOn" class="absolute bottom-2 right-2 w-20 aspect-video bg-black rounded-lg overflow-hidden border border-white/20">
          <video
            ref="localVideo"
            autoplay
            playsinline
            muted
            class="w-full h-full object-cover"
            v-src-object="callStore.localStream ?? null"
          />
        </div>
      </div>

      <!-- Header (drag handle) -->
      <div
        class="px-4 py-3 border-b border-[var(--v-border)] flex items-center justify-between cursor-grab active:cursor-grabbing"
        @mousedown="startDrag"
      >
        <div class="flex items-center space-x-3 pointer-events-none">
          <div class="w-8 h-8 rounded-xl bg-[var(--v-accent)]/10 flex items-center justify-center text-xs font-black text-[var(--v-accent)]">
            {{ callStore.callInfo?.peerName?.charAt(0).toUpperCase() ?? '?' }}
          </div>
          <div>
            <p class="text-sm font-black text-white leading-none">{{ callStore.callInfo?.peerName }}</p>
            <p class="text-[9px] font-bold uppercase tracking-widest mt-0.5" :class="statusColor">{{ statusLabel }}</p>
          </div>
        </div>
        <div class="flex items-center space-x-1">
          <span v-if="callStore.callState === 'active'" class="text-xs font-mono text-[var(--v-text-secondary)] mr-1 pointer-events-none">{{ timer }}</span>
          <button
            @click.stop="isMinimized = !isMinimized"
            class="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--v-text-secondary)] hover:bg-white/10 hover:text-white transition-all"
          >
            <svg v-if="!isMinimized" viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>
            <svg v-else viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          </button>
        </div>
      </div>

      <!-- Controls -->
      <div v-if="!isMinimized" class="px-4 py-3 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <!-- Mute -->
          <button
            @click="callStore.toggleMute()"
            class="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            :class="callStore.isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-[var(--v-text-secondary)] hover:bg-white/10 hover:text-white'"
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
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
          </button>

          <!-- Screen share -->
          <button
            v-if="callStore.callState === 'active'"
            @click="toggleScreen"
            class="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            :class="callStore.isScreenSharing ? 'bg-[var(--v-accent)]/20 text-[var(--v-accent)]' : 'bg-white/5 text-[var(--v-text-secondary)] hover:bg-white/10 hover:text-white'"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h3l-1 1v1h12v-1l-1-1h3c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 13H4V5h16v11z"/></svg>
          </button>

          <!-- Quality selector -->
          <div v-if="callStore.callState === 'active'" class="relative">
            <button
              @click.stop="showQuality = !showQuality"
              class="w-9 h-9 rounded-xl flex items-center justify-center transition-all bg-white/5 text-[var(--v-text-secondary)] hover:bg-white/10 hover:text-white"
              :title="`Quality: ${callStore.callQuality}`"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 9h4V5H3v4zm0 8h4v-4H3v4zm0-4h4v-4H3v4zm8 4h4v-4h-4v4zm4-8v-4h-4v4h4zm4 8h4v-4h-4v4zm-8-8v-4H7v4h4zm4 8h4v-4h-4v4zm0-16v4h4V5h-4zm-4 4H7v4h4V9zM3 5v4h4V5H3zm0 8h4v-4H3v4zm0 4h4v-4H3v4zm8 0h4v-4h-4v4zm4 0h4v-4h-4v4z"/></svg>
            </button>
            <div
              v-if="showQuality"
              v-click-outside="() => showQuality = false"
              class="absolute bottom-10 left-0 bg-[var(--v-bg-surface)] border border-[var(--v-border)] rounded-xl shadow-xl overflow-hidden z-10 w-28"
            >
              <button
                v-for="q in (['low', 'medium', 'high'] as const)"
                :key="q"
                @click="setQuality(q)"
                class="w-full px-3 py-2 text-left text-xs font-bold transition-all hover:bg-white/5 flex items-center space-x-2"
                :class="callStore.callQuality === q ? 'text-[var(--v-accent)]' : 'text-[var(--v-text-secondary)]'"
              >
                <span>{{ q === 'low' ? '🔵' : q === 'medium' ? '🟡' : '🟢' }}</span>
                <span class="capitalize">{{ q }}</span>
              </button>
            </div>
          </div>
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
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useCallStore } from '../stores/callStore'
import { useSocketStore } from '../stores/domain/socketStore'
import type { CallQuality } from '../utils/webrtc'

// Vue doesn't reliably set srcObject as a DOM property via :srcObject binding
const vSrcObject = {
    mounted(el: HTMLMediaElement, { value }: { value: MediaStream | null }) {
        el.srcObject = value
    },
    updated(el: HTMLMediaElement, { value }: { value: MediaStream | null }) {
        if (el.srcObject !== value) el.srcObject = value
    },
}

// Simple click-outside directive
const vClickOutside = {
    mounted(el: HTMLElement, { value }: { value: () => void }) {
        (el as any)._clickOutside = (e: MouseEvent) => {
            if (!el.contains(e.target as Node)) value()
        }
        document.addEventListener('mousedown', (el as any)._clickOutside)
    },
    unmounted(el: HTMLElement) {
        document.removeEventListener('mousedown', (el as any)._clickOutside)
    },
}

const callStore = useCallStore()
const socketStore = useSocketStore()

// ── Interrupted call reconnect ────────────────────────────────────────────────
const interruptedCall = ref(callStore.getInterruptedCall())

function reconnect() {
    if (!interruptedCall.value) return
    socketStore.initiateCall(interruptedCall.value.peerId, interruptedCall.value.callType)
    interruptedCall.value = null
}

// ── Visibility ────────────────────────────────────────────────────────────────
const visible = computed(() =>
    callStore.callState === 'connecting' || callStore.callState === 'active' ||
    callStore.callState === 'ringing-out' || callStore.callState === 'ringing-in'
)

const hasRemoteVideo = computed(() => {
    if (!callStore.remoteStream) return false
    return callStore.remoteStream.getVideoTracks().some(t => t.enabled && t.readyState === 'live')
})

// ── Minimize ──────────────────────────────────────────────────────────────────
const isMinimized = ref(false)

// ── Quality selector ──────────────────────────────────────────────────────────
const showQuality = ref(false)

async function setQuality(q: CallQuality) {
    const socket = socketStore.getSocket()
    if (socket) await callStore.setQuality(q, socket)
    showQuality.value = false
}

// ── Drag & corner snap ────────────────────────────────────────────────────────
type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

const overlayRef = ref<HTMLElement | null>(null)
const corner = ref<Corner>('bottom-right')
let isDragging = false
let dragOffsetX = 0
let dragOffsetY = 0
let lastX = 0
let lastY = 0
const OVERLAY_W = 288  // w-72 = 18rem
const PAD = 24

function applyCorner(el: HTMLElement, c: Corner) {
    el.style.top = ''
    el.style.left = ''
    el.style.bottom = ''
    el.style.right = ''
    switch (c) {
        case 'top-left':     el.style.top = `${PAD}px`;    el.style.left = `${PAD}px`; break
        case 'top-right':    el.style.top = `${PAD}px`;    el.style.right = `${PAD}px`; break
        case 'bottom-left':  el.style.bottom = `${PAD}px`; el.style.left = `${PAD}px`; break
        case 'bottom-right': el.style.bottom = `${PAD}px`; el.style.right = `${PAD}px`; break
    }
}

// Apply corner when overlay first appears or corner changes
watch([visible, corner, overlayRef], async ([vis]) => {
    if (!vis) return
    await nextTick()
    const el = overlayRef.value
    if (el) applyCorner(el, corner.value)
}, { immediate: true })

function startDrag(e: MouseEvent) {
    // Don't start drag if user clicked a button
    if ((e.target as HTMLElement).closest('button')) return
    const el = overlayRef.value
    if (!el) return

    const rect = el.getBoundingClientRect()
    dragOffsetX = e.clientX - rect.left
    dragOffsetY = e.clientY - rect.top
    lastX = rect.left
    lastY = rect.top

    // Switch to top/left positioning immediately via direct DOM
    el.style.transition = 'none'
    el.style.bottom = ''
    el.style.right = ''
    el.style.top = `${rect.top}px`
    el.style.left = `${rect.left}px`
    isDragging = true

    window.addEventListener('mousemove', onDrag)
    window.addEventListener('mouseup', stopDrag)
    e.preventDefault()
}

function onDrag(e: MouseEvent) {
    if (!isDragging) return
    const el = overlayRef.value
    if (!el) return
    lastX = e.clientX - dragOffsetX
    lastY = e.clientY - dragOffsetY
    el.style.left = `${lastX}px`
    el.style.top = `${lastY}px`
}

function stopDrag() {
    if (!isDragging) return
    isDragging = false
    window.removeEventListener('mousemove', onDrag)
    window.removeEventListener('mouseup', stopDrag)

    // Snap to nearest corner based on center of overlay
    const cx = lastX + OVERLAY_W / 2
    const cy = lastY
    const midX = window.innerWidth / 2
    const midY = window.innerHeight / 2

    let newCorner: Corner
    if (cx < midX && cy < midY)       newCorner = 'top-left'
    else if (cx >= midX && cy < midY) newCorner = 'top-right'
    else if (cx < midX && cy >= midY) newCorner = 'bottom-left'
    else                               newCorner = 'bottom-right'

    const el = overlayRef.value
    if (el) {
        el.style.transition = 'all 0.2s ease'
        applyCorner(el, newCorner)
        // Clear transition after animation
        setTimeout(() => { if (overlayRef.value) overlayRef.value.style.transition = '' }, 220)
    }
    corner.value = newCorner
}

onUnmounted(() => {
    window.removeEventListener('mousemove', onDrag)
    window.removeEventListener('mouseup', stopDrag)
})

// ── Status ────────────────────────────────────────────────────────────────────
const statusLabel = computed(() => {
    switch (callStore.callState) {
        case 'ringing-out': return 'Calling...'
        case 'ringing-in':  return 'Incoming...'
        case 'connecting':  return 'Connecting...'
        case 'active':      return 'In call'
        default: return ''
    }
})

const statusColor = computed(() =>
    callStore.callState === 'active' ? 'text-[var(--v-accent)]' : 'text-[var(--v-text-secondary)]'
)

// ── Timer ─────────────────────────────────────────────────────────────────────
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

// ── Actions ───────────────────────────────────────────────────────────────────
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
