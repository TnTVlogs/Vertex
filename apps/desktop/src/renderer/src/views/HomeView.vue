<script setup lang="ts">
import MainLayout from '../components/MainLayout.vue'
import Auth from './Auth.vue'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()
</script>

<template>
  <MainLayout v-if="authStore.user" />
  <Auth v-else />
</template>
