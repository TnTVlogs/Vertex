<template>
  <div class="h-screen w-screen bg-[#111111] flex flex-col items-center justify-center text-white app-region-drag relative overflow-hidden">
    <!-- Gradient Background Element -->
    <div class="absolute inset-0 z-0 opacity-20 pointer-events-none">
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full blur-[100px]"></div>
    </div>

    <!-- Content Card -->
    <div class="z-10 flex flex-col items-center app-region-no-drag">
      <!-- Loading Spinner / Logo -->
      <div class="relative w-24 h-24 mb-8">
        <div class="absolute inset-0 rounded-full border-4 border-[#333333]"></div>
        <div class="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
        <div class="absolute inset-0 flex items-center justify-center">
          <svg class="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>

      <!-- Text Status -->
      <h1 class="text-2xl font-bold mb-2 tracking-tight">Vertex</h1>
      <p class="text-gray-400 text-sm mb-6 transition-all duration-300 font-medium">
        {{ uiState.message || 'Iniciant...' }}
      </p>

      <!-- Progress Bar (Auto Update) -->
      <div v-show="uiState.progress !== undefined" class="w-64 bg-[#222222] rounded-full h-1.5 mb-6 overflow-hidden">
        <div class="bg-indigo-500 h-1.5 rounded-full transition-all duration-300" :style="{ width: uiState.progress + '%' }"></div>
      </div>

      <!-- Error Buttons -->
      <div v-if="uiState.isError" class="flex gap-4 mt-2">
        <button 
          @click="retry" 
          class="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
        >
          Reintentar
        </button>
        <button 
          @click="quit" 
          class="px-6 py-2 bg-[#2a2a2a] hover:bg-[#333333] active:bg-[#444444] text-sm font-semibold rounded-lg transition-colors cursor-pointer"
        >
          Sortir
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'

const uiState = reactive({
  message: 'Connectant amb el servidor...',
  progress: undefined as number | undefined,
  isError: false
})

onMounted(() => {
  if (window.api && window.api.onSplashMessage) {
    window.api.onSplashMessage((event, data) => {
      uiState.message = data.message
      uiState.progress = data.progress
      uiState.isError = data.isError || false
    })
  }
})

const retry = () => {
  uiState.isError = false
  uiState.message = 'Reintentant...'
  if (window.api && window.api.splashRetry) {
    window.api.splashRetry()
  }
}

const quit = () => {
  if (window.api && window.api.splashQuit) {
    window.api.splashQuit()
  }
}
</script>

<style scoped>
.app-region-drag {
  -webkit-app-region: drag;
}
.app-region-no-drag {
  -webkit-app-region: no-drag;
}
</style>
