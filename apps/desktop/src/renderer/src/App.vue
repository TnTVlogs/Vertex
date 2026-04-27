<script setup lang="ts">
import { RouterView } from 'vue-router'
import Splash from './views/Splash.vue'
import ToastContainer from './components/ToastContainer.vue'
import { useAuthStore } from './stores/authStore'
import { useSettingsStore } from './stores/settingsStore'
import { useCallStore } from './stores/callStore'
import { onMounted, onUnmounted, ref } from 'vue'

useSettingsStore()

const authStore = useAuthStore()
const callStore = useCallStore()
const ready = ref(false)

const urlParams = new URLSearchParams(window.location.search)
const isSplash = ref(urlParams.get('splash') === 'true')

function onBeforeUnload(e: BeforeUnloadEvent) {
  const s = callStore.callState
  if (s === 'idle' || s === 'ended') return
  e.preventDefault()
  // Modern browsers ignore custom message but need a non-empty string
  e.returnValue = 'You are in a call — leaving will end it.'
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
