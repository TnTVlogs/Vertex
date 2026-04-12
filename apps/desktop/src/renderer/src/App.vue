<script setup lang="ts">
import MainLayout from './components/MainLayout.vue'
import Auth from './views/Auth.vue'
import Splash from './views/Splash.vue'
import InvitePreview from './views/InvitePreview.vue'
import ToastContainer from './components/ToastContainer.vue'
import { useAuthStore } from './stores/authStore'
import { useSettingsStore } from './stores/settingsStore'
import { onMounted, ref } from 'vue'

const settingsStore = useSettingsStore()

const urlParams = new URLSearchParams(window.location.search);
const isSplash = ref(urlParams.get('splash') === 'true');

const authStore = useAuthStore()
const ready = ref(false)
const inviteCode = ref<string | null>(null)

onMounted(async () => {
  if (isSplash.value) return; // Splash screen mode doesn't need auth init

  const path = window.location.pathname;
  if (path.startsWith('/invite/')) {
    inviteCode.value = path.split('/')[2] || null;
  }

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
    <InvitePreview v-if="inviteCode" :code="inviteCode" />
    <MainLayout v-else-if="authStore.user" />
    <Auth v-else />
  </template>
  
  <ToastContainer />
</template>
