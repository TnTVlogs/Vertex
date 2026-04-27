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
  if (callStore.callState !== 'active' && callStore.callState !== 'connecting') return
  e.preventDefault()
  e.returnValue = 'You are currently in a call. If you reload, the call will end.'
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
