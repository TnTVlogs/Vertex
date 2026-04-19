<script setup lang="ts">
import { RouterView } from 'vue-router'
import Splash from './views/Splash.vue'
import ToastContainer from './components/ToastContainer.vue'
import { useAuthStore } from './stores/authStore'
import { useSettingsStore } from './stores/settingsStore'
import { onMounted, ref } from 'vue'

useSettingsStore()

const authStore = useAuthStore()
const ready = ref(false)

const urlParams = new URLSearchParams(window.location.search)
const isSplash = ref(urlParams.get('splash') === 'true')

onMounted(async () => {
  if (isSplash.value) return
  if (typeof authStore.init === 'function') await authStore.init()
  ready.value = true
})
</script>

<template>
  <Splash v-if="isSplash" />
  <RouterView v-else-if="ready" />

  <ToastContainer />
</template>
