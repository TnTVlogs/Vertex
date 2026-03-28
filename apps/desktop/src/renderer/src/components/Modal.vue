<template>
  <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[var(--v-bg-base)]/95 animate-in fade-in duration-300">
    <div @click.stop class="glass w-full max-w-md rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-300 relative">
      <!-- Glow Effect -->
      <div class="absolute -top-24 -right-24 w-48 h-48 bg-[var(--v-accent)] opacity-10 blur-[60px] rounded-full"></div>
      
      <div class="p-10 relative z-10">
        <h3 class="text-3xl font-black text-white mb-3 text-center tracking-tighter italic italic">{{ title }}</h3>
        <slot name="description"></slot>
        
        <div class="mt-8 space-y-1.5 px-2">
          <label class="block text-[10px] font-black text-[var(--v-text-secondary)] uppercase tracking-[0.3em] px-1">
            <slot name="label"></slot>
          </label>
          <input 
            v-model="inputValue"
            @keyup.enter="handleConfirm"
            class="w-full bg-[var(--v-bg-base)] border border-[var(--v-border)] rounded-2xl px-5 py-3.5 text-sm font-medium focus:border-[var(--v-accent)] outline-none transition-all text-white placeholder-white/20"
            autofocus
            placeholder="INPUT_VAL_01"
          />
        </div>
      </div>
      
      <div class="bg-[var(--v-bg-sidebar)] border-t border-[var(--v-border)] p-6 flex items-center justify-end space-x-3 px-10 relative z-10">
        <button @click="emit('close')" class="text-[10px] font-black text-[var(--v-text-secondary)] hover:text-white uppercase tracking-widest px-4 py-2 transition-colors">
          Abort
        </button>
        <button 
          @click="handleConfirm"
          class="vertex-gradient text-[var(--v-bg-base)] px-8 py-3 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest"
        >
          Confirm Uplink
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  title: string
  show: boolean
}>()

const emit = defineEmits(['close', 'confirm'])

const inputValue = ref('')

const handleConfirm = () => {
  if (inputValue.value.trim()) {
    emit('confirm', inputValue.value)
    inputValue.value = ''
  }
}
</script>

<style scoped>
</style>
