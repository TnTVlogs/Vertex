<template>
  <div class="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
    <header>
      <h3 class="text-3xl font-black italic uppercase tracking-tighter text-[var(--v-text-primary)]">{{ i18n.t('settings.category.visual') }}</h3>
      <p class="text-[var(--v-text-secondary)] text-xs mt-2 uppercase font-bold tracking-widest">System Interface Shaders</p>
    </header>

    <section class="space-y-6">
      <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--v-text-secondary)]">{{ i18n.t('settings.visual.theme') }}</h4>
      <div class="grid grid-cols-2 gap-6">
        <button
          @click="settingsStore.setTheme('dark')"
          class="group relative flex flex-col items-center justify-center p-8 rounded-3xl border-2 transition-all cursor-pointer overflow-hidden"
          :class="settingsStore.theme === 'dark' ? 'border-[var(--v-accent)] bg-[var(--v-accent)]/5 shadow-[0_0_30px_var(--v-accent-glow)]' : 'border-[var(--v-border)] bg-[var(--v-bg-surface)] hover:border-[var(--v-text-secondary)]'"
        >
          <div class="w-full h-24 rounded-xl bg-[#0a0a0a] border border-white/5 mb-4 shadow-inner relative">
            <div class="absolute top-3 left-3 w-1/2 h-2 bg-white/5 rounded-full"></div>
            <div class="absolute bottom-3 right-3 w-5 h-5 bg-[#10B981] rounded-lg rotate-12"></div>
          </div>
          <span class="font-black text-xs uppercase tracking-widest">{{ i18n.t('settings.visual.dark') }}</span>
        </button>

        <button
          @click="settingsStore.setTheme('light')"
          class="group relative flex flex-col items-center justify-center p-8 rounded-3xl border-2 transition-all cursor-pointer overflow-hidden"
          :class="settingsStore.theme === 'light' ? 'border-[var(--v-accent)] bg-[var(--v-accent)]/5 shadow-[0_0_30px_var(--v-accent-glow)]' : 'border-[var(--v-border)] bg-[var(--v-bg-surface)] hover:border-[var(--v-text-secondary)]'"
        >
          <div class="w-full h-24 rounded-xl bg-[#f7f7f8] border border-black/5 mb-4 shadow-inner relative">
            <div class="absolute top-3 left-3 w-1/2 h-2 bg-black/5 rounded-full"></div>
            <div class="absolute bottom-3 right-3 w-5 h-5 bg-[#10B981] rounded-lg rotate-12"></div>
          </div>
          <span class="font-black text-xs uppercase tracking-widest">{{ i18n.t('settings.visual.light') }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '../../stores/settingsStore'
import { useI18nStore } from '../../stores/i18nStore'

const settingsStore = useSettingsStore()
const i18n = useI18nStore()
</script>
