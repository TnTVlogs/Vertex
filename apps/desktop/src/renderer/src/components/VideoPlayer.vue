<template>
  <div ref="wrapper"
    class="relative bg-black select-none"
    :class="isFullscreen ? '' : 'rounded-xl overflow-hidden'"
    :style="isFullscreen ? 'width:100vw;height:100vh;' : 'width:260px'"
    @mouseenter="revealCtrl"
    @mouseleave="startHide"
    @mousemove="revealCtrl">

    <!--
      Video is ALWAYS in the DOM and never display:none — Chromium won't load
      metadata for display:none or zero-height-wrapper elements.
      We control visibility via opacity + sizing instead.
    -->
    <video ref="el" :src="src" preload="auto"
      class="w-full block cursor-pointer"
      :style="videoStyle"
      @loadedmetadata="onMeta"
      @canplay="onCanPlay"
      @timeupdate="onTime"
      @play="playing = true"
      @pause="playing = false"
      @ended="playing = false"
      @click="toggle" />

    <!-- Spinner overlay while waiting for metadata -->
    <div v-if="!audioOnly && !videoReady"
      class="absolute inset-0 flex items-center justify-center">
      <div class="w-4 h-4 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
    </div>

    <!-- Audio-only layout (MP4 without video track) -->
    <div v-if="audioOnly" class="flex items-center gap-2 px-3 py-2.5">
      <button @click="toggle"
        class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/20 hover:bg-white/35 active:scale-95 transition-all text-white">
        <svg v-if="!playing" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
      </button>
      <div class="flex-1 flex flex-col gap-1 min-w-0">
        <input type="range" class="seek w-full"
          :max="duration || 100" :value="currentTime" step="0.1" @input="seek" />
        <div class="flex justify-between text-[9px] font-mono text-white/55">
          <span>{{ fmt(currentTime) }}</span>
          <span>{{ fmt(duration) }}</span>
        </div>
      </div>
      <button @click="toggleMute" class="text-white/55 hover:text-white transition-colors shrink-0">
        <svg v-if="!muted" viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
        </svg>
      </button>
      <input type="range" class="vol" min="0" max="1" step="0.05"
        :value="volume" @input="onVol" style="width: 44px" />
      <a :href="src" download class="w-6 h-6 flex items-center justify-center text-white/55 hover:text-white transition-colors shrink-0">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
      </a>
    </div>

    <!-- Big play button (video paused) -->
    <div v-if="!audioOnly && videoReady && !playing"
      class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div :class="isFullscreen ? 'w-20 h-20' : 'w-12 h-12'"
        class="rounded-full bg-black/55 flex items-center justify-center transition-all">
        <svg viewBox="0 0 24 24" :width="isFullscreen ? 36 : 22" :height="isFullscreen ? 36 : 22" fill="white">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </div>
    </div>

    <!-- Controls overlay (video mode) -->
    <div v-if="!audioOnly && videoReady"
      class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-200"
      :class="[showCtrl || !playing ? 'opacity-100' : 'opacity-0']"
      :style="isFullscreen ? 'padding:1.5rem 1.5rem 1.25rem;height:72px;box-sizing:border-box;' : 'padding:2rem 0.625rem 0.5rem;'">

      <input type="range" :class="isFullscreen ? 'seek-fs' : 'seek'" class="w-full mb-2"
        :max="duration || 100" :value="currentTime" step="0.1" @input="seek" />

      <div class="flex items-center justify-between">
        <div class="flex items-center" :class="isFullscreen ? 'gap-4' : 'gap-2'">
          <button @click="toggle" class="text-white hover:text-white/80 transition-colors">
            <svg v-if="!playing" viewBox="0 0 24 24" :width="isFullscreen ? 28 : 16" :height="isFullscreen ? 28 : 16" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" :width="isFullscreen ? 28 : 16" :height="isFullscreen ? 28 : 16" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          </button>
          <span :class="isFullscreen ? 'text-base' : 'text-[9px]'" class="font-mono text-white/70 tabular-nums">
            {{ fmt(currentTime) }} / {{ fmt(duration) }}
          </span>
        </div>

        <div class="flex items-center" :class="isFullscreen ? 'gap-4' : 'gap-1.5'">
          <button @click="toggleMute" class="text-white/70 hover:text-white transition-colors">
            <svg v-if="!muted" viewBox="0 0 24 24" :width="isFullscreen ? 22 : 14" :height="isFullscreen ? 22 : 14" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" :width="isFullscreen ? 22 : 14" :height="isFullscreen ? 22 : 14" fill="currentColor">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
          </button>
          <input type="range" :class="isFullscreen ? 'vol-fs' : 'vol'" min="0" max="1" step="0.05"
            :value="volume" @input="onVol" :style="isFullscreen ? 'width:80px' : 'width:44px'" />
          <button @click="toggleFullscreen" class="text-white/70 hover:text-white transition-colors">
            <svg v-if="!isFullscreen" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
            </svg>
          </button>
          <a :href="src" download class="text-white/70 hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" :width="isFullscreen ? 22 : 14" :height="isFullscreen ? 22 : 14" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

defineProps<{ src: string }>()

const wrapper = ref<HTMLElement | null>(null)
const el = ref<HTMLVideoElement | null>(null)

const playing = ref(false)
const muted = ref(false)
const volume = ref(1)
const prevVolume = ref(1)
const audioOnly = ref(false)
const videoReady = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const showCtrl = ref(true)
const isFullscreen = ref(false)

let hideTimer: ReturnType<typeof setTimeout> | null = null
let metaTimer: ReturnType<typeof setTimeout> | null = null

// Video element style: always rendered (no display:none) so Chromium loads metadata.
// - Before metadata: tiny visible black square (spinner overlay covers it)
// - audioOnly detected: zero size, out of flow
// - videoReady: full size
const videoStyle = computed(() => {
  if (audioOnly.value) {
    return 'width:0;height:0;position:absolute;overflow:hidden;'
  }
  if (isFullscreen.value && videoReady.value) {
    // Fill wrapper (100vw x 100vh), leave room for controls bar (~72px)
    return 'position:absolute;top:0;left:0;width:100%;height:calc(100vh - 72px);object-fit:contain;'
  }
  if (!videoReady.value) {
    return 'max-height:54px;object-fit:contain;opacity:0;'
  }
  return 'max-height:192px;object-fit:contain;'
})

function revealCtrl() {
  showCtrl.value = true
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
}

function startHide() {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => { showCtrl.value = false }, 2000)
}

function applyMeta() {
  const v = el.value
  if (!v || audioOnly.value || videoReady.value) return
  if (metaTimer) { clearTimeout(metaTimer); metaTimer = null }
  duration.value = v.duration || 0
  if (v.videoWidth === 0 || v.videoHeight === 0) {
    audioOnly.value = true
  } else {
    videoReady.value = true
  }
}

function onMeta() { applyMeta() }
function onCanPlay() { applyMeta() }

function onTime() { currentTime.value = el.value?.currentTime ?? 0 }

function toggle() {
  if (!el.value) return
  if (playing.value) el.value.pause()
  else el.value.play()
}

function seek(e: Event) {
  if (!el.value) return
  el.value.currentTime = +(e.target as HTMLInputElement).value
}

function toggleMute() {
  if (!el.value) return
  if (muted.value) {
    muted.value = false
    volume.value = prevVolume.value || 1
    el.value.volume = volume.value
    el.value.muted = false
  } else {
    prevVolume.value = volume.value
    muted.value = true
    volume.value = 0
    el.value.muted = true
  }
}

function onVol(e: Event) {
  const v = +(e.target as HTMLInputElement).value
  volume.value = v
  if (!el.value) return
  el.value.volume = v
  el.value.muted = v === 0
  muted.value = v === 0
  if (v > 0) prevVolume.value = v
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    wrapper.value?.requestFullscreen().catch(() => {})
  } else {
    document.exitFullscreen()
  }
}

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
  if (isFullscreen.value) revealCtrl()
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
  // Force load — Electron sometimes ignores preload="auto" until explicit call
  el.value?.load()
  // Timeout fallback: if loadedmetadata+canplay never fire, treat as audio-only
  metaTimer = setTimeout(() => {
    if (!audioOnly.value && !videoReady.value) audioOnly.value = true
  }, 4000)
})
onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  if (hideTimer) clearTimeout(hideTimer)
  if (metaTimer) clearTimeout(metaTimer)
})

function fmt(s: number) {
  if (!s || !isFinite(s)) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}
</script>

<style scoped>
.seek, .seek-fs {
  -webkit-appearance: none;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  display: block;
}
.seek { height: 3px; }
.seek-fs { height: 5px; }

.seek::-webkit-slider-thumb, .seek-fs::-webkit-slider-thumb {
  -webkit-appearance: none;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  transition: transform 0.1s;
}
.seek::-webkit-slider-thumb { width: 11px; height: 11px; }
.seek-fs::-webkit-slider-thumb { width: 18px; height: 18px; }
.seek::-webkit-slider-thumb:hover,
.seek-fs::-webkit-slider-thumb:hover { transform: scale(1.3); }

.vol, .vol-fs {
  -webkit-appearance: none;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.vol { height: 3px; }
.vol-fs { height: 5px; }
.vol::-webkit-slider-thumb, .vol-fs::-webkit-slider-thumb {
  -webkit-appearance: none;
  border-radius: 50%;
  background: white;
  cursor: pointer;
}
.vol::-webkit-slider-thumb { width: 9px; height: 9px; }
.vol-fs::-webkit-slider-thumb { width: 16px; height: 16px; }

</style>
