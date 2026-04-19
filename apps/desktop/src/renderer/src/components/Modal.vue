<template>
  <div
    v-if="show"
    class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[var(--v-bg-base)]/95 animate-in fade-in duration-300"
    @click="!loading && emit('close')"
    @keydown.esc="!loading && emit('close')"
    tabindex="-1"
  >
    <div
      @click.stop
      class="glass w-full max-w-md rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-300 relative"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="modalTitleId"
    >
      <!-- Glow Effect -->
      <div class="absolute -top-24 -right-24 w-48 h-48 bg-[var(--v-accent)] opacity-10 blur-[60px] rounded-full"></div>

      <div class="p-10 relative z-10">
        <h3
          :id="modalTitleId"
          class="text-3xl font-black text-white mb-3 text-center tracking-tighter italic"
        >
          {{ title }}
        </h3>
        <slot name="description"></slot>

        <div class="mt-8 space-y-1.5 px-2">
          <label
            :for="modalInputId"
            class="block text-[10px] font-black text-[var(--v-text-secondary)] uppercase tracking-[0.3em] px-1"
          >
            <slot name="label"></slot>
          </label>
          <input
            :id="modalInputId"
            ref="inputRef"
            v-model="inputValue"
            :disabled="loading"
            @keyup.enter="handleConfirm"
            class="w-full bg-[var(--v-bg-base)] border border-[var(--v-border)] rounded-2xl px-5 py-3.5 text-sm font-medium focus:border-[var(--v-accent)] outline-none transition-all text-white placeholder-white/20 custom-caret disabled:opacity-50"
            placeholder="INPUT_VAL_01"
          />
        </div>
      </div>

      <div class="bg-[var(--v-bg-sidebar)] border-t border-[var(--v-border)] p-6 flex items-center justify-end space-x-3 px-10 relative z-10">
        <button
          @click="emit('close')"
          :disabled="loading"
          class="text-[10px] font-black text-[var(--v-text-secondary)] hover:text-white uppercase tracking-widest px-4 py-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Abort
        </button>
        <button
          @click="handleConfirm"
          :disabled="loading"
          class="vertex-gradient text-[var(--v-bg-base)] px-8 py-3 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
        >
          <span v-if="loading" class="flex items-center">
            <svg class="animate-spin -ml-1 mr-3 h-3 w-3 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
          <span v-else>Confirm Uplink</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  title: string
  show: boolean
  loading?: boolean
}>()

const emit = defineEmits(['close', 'confirm'])

const inputValue = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const modalTitleId = `modal-title-${Math.random().toString(36).slice(2, 9)}`
const modalInputId = `modal-input-${Math.random().toString(36).slice(2, 9)}`

// Escape key handling
const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.show && !props.loading) {
    emit('close')
  }
}

watch(() => props.show, async (newVal) => {
  if (newVal) {
    inputValue.value = '' // Reset when showing
    await nextTick()
    if (inputRef.value) {
      inputRef.value.focus()
    }
    window.addEventListener('keydown', handleEscape)
  } else {
    window.removeEventListener('keydown', handleEscape)
  }
})

onMounted(() => {
  if (props.show) window.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscape)
})

const handleConfirm = () => {
  if (inputValue.value.trim() && !props.loading) {
    emit('confirm', inputValue.value)
  }
}
</script>

<style scoped>
.custom-caret {
  caret-color: var(--v-accent);
}
</style>
