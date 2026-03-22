<script setup lang="ts">
import MainLayout from './components/MainLayout.vue'
import Auth from './views/Auth.vue'
import { useAuthStore } from './stores/authStore'
import { onMounted, ref } from 'vue'

const authStore = useAuthStore()
const ready = ref(false)

onMounted(async () => {
  console.log('App: onMounted starting auth init');
  if (typeof authStore.init === 'function') await authStore.init()
  console.log('App: Auth init done, user:', authStore.user);
  ready.value = true
})
</script>

<template>
  <template v-if="ready">
    <MainLayout v-if="authStore.user" />
    <Auth v-else />
  </template>
</template>
