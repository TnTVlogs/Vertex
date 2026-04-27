<script setup lang="ts">
import { RouterView } from 'vue-router'
import Splash from './views/Splash.vue'
import ToastContainer from './components/ToastContainer.vue'
import { useAuthStore } from './stores/authStore'
import { useSettingsStore } from './stores/settingsStore'
import { useCallStore } from './stores/callStore'
import { useVoiceChannelStore } from './stores/voiceChannelStore'
import { onMounted, onUnmounted, ref } from 'vue'

useSettingsStore()

const authStore = useAuthStore()
const callStore = useCallStore()
const voiceStore = useVoiceChannelStore()
const ready = ref(false)

const urlParams = new URLSearchParams(window.location.search)
const isSplash = ref(urlParams.get('splash') === 'true')

function onBeforeUnload(e: BeforeUnloadEvent) {
  const callActive = callStore.callState !== 'idle' && callStore.callState !== 'ended'
  const voiceActive = !!voiceStore.activeChannelId
  if (!callActive && !voiceActive) return
  e.preventDefault()
  e.returnValue = ''  // non-empty string required in older browsers; modern ones ignore the text
  return e.returnValue
}

onMounted(async () => {
  window.addEventListener('beforeunload', onBeforeUnload)
  if (isSplash.value) return
  if (typeof authStore.init === 'function') await authStore.init()
  ready.value = true
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
})
</script>

<template>
  <Splash v-if="isSplash" />
  <RouterView v-else-if="ready" />

  <ToastContainer />
</template>
