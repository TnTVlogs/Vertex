<template>
  <div style="width: 260px" class="rounded-xl overflow-hidden bg-black/25">
    <audio ref="el" :src="src" preload="metadata"
      @timeupdate="onTime" @loadedmetadata="onMeta" @ended="playing = false" />

    <div class="flex items-center gap-2 px-3 py-2.5">
      <!-- Play / Pause -->
      <button @click="toggle"
        class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/20 hover:bg-white/35 active:scale-95 transition-all text-white">
        <svg v-if="!playing" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
      </button>

      <!-- Seek + Time -->
      <div class="flex-1 flex flex-col gap-1 min-w-0">
        <input type="range" class="seek w-full"
          :max="duration || 100" :value="currentTime" step="0.1" @input="seek" />
        <div class="flex justify-between text-[9px] font-mono text-white/55">
          <span>{{ fmt(currentTime) }}</span>
          <span>{{ fmt(duration) }}</span>
        </div>
      </div>

      <!-- Mute -->
      <button @click="toggleMute"
        class="w-6 h-6 flex items-center justify-center text-white/55 hover:text-white transition-colors shrink-0">
        <svg v-if="!muted" viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
        </svg>
      </button>

      <!-- Volume slider -->
      <input type="range" class="vol" min="0" max="1" step="0.05"
        :value="volume" @input="onVol" style="width: 40px" />

      <!-- Download -->
      <a :href="src" download
        class="w-6 h-6 flex items-center justify-center text-white/55 hover:text-white transition-colors shrink-0">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ src: string }>()

const el = ref<HTMLAudioElement | null>(null)
const playing = ref(false)
const muted = ref(false)
const volume = ref(1)
const prevVolume = ref(1)
const currentTime = ref(0)
const duration = ref(0)

function toggle() {
  if (!el.value) return
  if (playing.value) { el.value.pause(); playing.value = false }
  else { el.value.play().then(() => { playing.value = true }).catch(() => {}) }
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

function seek(e: Event) {
  if (!el.value) return
  el.value.currentTime = +(e.target as HTMLInputElement).value
}

function onTime() { currentTime.value = el.value?.currentTime ?? 0 }
function onMeta() { duration.value = el.value?.duration ?? 0 }


function fmt(s: number) {
  if (!s || !isFinite(s)) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}
</script>

<style scoped>
.vol {
  -webkit-appearance: none;
  height: 3px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.vol::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
}

.seek {
  -webkit-appearance: none;
  height: 3px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  display: block;
}
.seek::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  transition: transform 0.1s;
}
.seek::-webkit-slider-thumb:hover {
  transform: scale(1.3);
}
</style>
