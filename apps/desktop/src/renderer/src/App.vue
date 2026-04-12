<script setup lang="ts">
import MainLayout from './components/MainLayout.vue'
import Auth from './views/Auth.vue'
import Splash from './views/Splash.vue'
import ToastContainer from './components/ToastContainer.vue'
import { useAuthStore } from './stores/authStore'
import { useSettingsStore } from './stores/settingsStore'
import { onMounted, ref } from 'vue'

const settingsStore = useSettingsStore()

const urlParams = new URLSearchParams(window.location.search);
const isSplash = ref(urlParams.get('splash') === 'true');

const authStore = useAuthStore()
const ready = ref(false)

onMounted(async () => {
  if (isSplash.value) return; // Splash screen mode doesn't need auth init

  console.log('App: onMounted starting auth init');
  if (typeof authStore.init === 'function') await authStore.init()
  console.log('App: Auth init done, user:', authStore.user);
  ready.value = true
})
</script>

<template>
  <template v-if="isSplash">
    <Splash />
  </template>
  <template v-else-if="ready">
    <MainLayout v-if="authStore.user" />
    <Auth v-else />
  </template>
  
  <ToastContainer />
</template>
