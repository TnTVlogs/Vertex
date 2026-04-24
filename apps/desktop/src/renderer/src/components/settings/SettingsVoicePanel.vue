<template>
  <div class="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
    <header>
      <h3 class="text-3xl font-black italic uppercase tracking-tighter text-[var(--v-text-primary)]">{{ i18n.t('settings.category.voice') }}</h3>
      <p class="text-[var(--v-text-secondary)] text-xs mt-2 uppercase font-bold tracking-widest">Acoustic Uplink Core</p>
    </header>

    <section class="p-12 flex flex-col items-center justify-center bg-[var(--v-bg-surface)] rounded-3xl border border-[var(--v-border)] text-center space-y-4">
      <div class="w-16 h-16 rounded-full bg-[var(--v-accent)]/10 flex items-center justify-center text-[var(--v-accent)] mb-2">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
      </div>
      <h4 class="text-xl font-black text-[var(--v-text-primary)] uppercase italic tracking-tighter">{{ i18n.t('settings.voice.upcoming') }}</h4>
      <p class="text-xs font-bold text-[var(--v-text-secondary)] uppercase tracking-widest max-w-xs leading-loose opacity-60">{{ i18n.t('settings.voice.desc') }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useI18nStore } from '../../stores/i18nStore'
const i18n = useI18nStore()
</script>
