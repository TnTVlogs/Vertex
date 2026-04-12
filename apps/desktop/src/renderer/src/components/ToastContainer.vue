<template>
  <div class="fixed bottom-6 right-6 z-[200] flex flex-col items-end space-y-4 pointer-events-none">
    <TransitionGroup name="toast" tag="div" class="flex flex-col items-end space-y-4">
      <div 
        v-for="toast in toastStore.toasts" 
        :key="toast.id"
        @click="toastStore.removeToast(toast.id)"
        class="toast-item pointer-events-auto cursor-pointer max-w-sm w-full bg-[var(--v-bg-surface)] border border-[white]/10 rounded-2xl shadow-[0_15px_40px_-15px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-xl relative group flex flex-col"
      >
        <!-- Content -->
        <div class="flex items-start p-4 space-x-4">
          <!-- Icon depending on type -->
          <div class="shrink-0 mt-0.5">
             <div v-if="toast.type === 'success'" class="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
             </div>
             <div v-else-if="toast.type === 'error'" class="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </div>
             <div v-else-if="toast.type === 'warning'" class="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
             </div>
             <div v-else class="w-8 h-8 rounded-full bg-[var(--v-accent)]/10 flex items-center justify-center text-[var(--v-accent)]">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
             </div>
          </div>
          
          <div class="flex-1 pt-1 break-words">
            <h4 class="text-[10px] font-black uppercase text-white/50 tracking-widest mb-1">
               {{ getTitle(toast.type) }}
            </h4>
            <p class="text-white text-sm font-medium leading-normal">{{ toast.message }}</p>
          </div>
          
          <!-- Close button -->
          <button class="shrink-0 text-white/20 hover:text-white transition-colors p-1" @click.stop="toastStore.removeToast(toast.id)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <!-- Progress Bar -->
        <div class="h-1 bg-white/5 w-full relative">
           <div 
             class="absolute top-0 left-0 h-full progress-fill" 
             :class="{
               'bg-emerald-500': toast.type === 'success',
               'bg-red-500': toast.type === 'error',
               'bg-yellow-500': toast.type === 'warning',
               'bg-[var(--v-accent)]': toast.type === 'info' || !toast.type
             }"
             :style="{ 'animation-duration': toast.duration + 'ms' }"
           ></div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useToastStore, ToastType } from '../stores/toastStore';

const toastStore = useToastStore();

const getTitle = (type: ToastType) => {
    switch(type) {
        case 'success': return 'Action Successful';
        case 'error': return 'System Error';
        case 'warning': return 'Warning';
        default: return 'Information';
    }
}
</script>

<style scoped>
/* Vue Transition Group animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(50px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(50px) scale(0.95);
}

/* Progress bar animation */
.progress-fill {
  animation-name: deplete;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}

@keyframes deplete {
  from { width: 100%; }
  to { width: 0%; }
}

.toast-item {
   background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
}
</style>
