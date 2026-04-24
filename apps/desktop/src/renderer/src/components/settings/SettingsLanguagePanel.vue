<template>
  <div class="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
    <header>
      <h3 class="text-3xl font-black italic uppercase tracking-tighter text-[var(--v-text-primary)]">{{ i18n.t('settings.category.language') }}</h3>
      <p class="text-[var(--v-text-secondary)] text-xs mt-2 uppercase font-bold tracking-widest">Neural Lexicon Matrix</p>
    </header>

    <section class="space-y-4">
      <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--v-text-secondary)] mb-6">{{ i18n.t('settings.language.select') }}</h4>
      <div class="grid grid-cols-1 gap-3">
        <button
          v-for="lang in (['ca', 'es', 'en'] as LanguageType[])"
          :key="lang"
          @click="settingsStore.setLanguage(lang)"
          class="flex items-center justify-between p-5 rounded-2xl border-2 transition-all group font-bold"
          :class="settingsStore.language === lang
            ? 'border-[var(--v-accent)] bg-[var(--v-accent)]/5'
            : 'border-[var(--v-border)] bg-[var(--v-bg-surface)] hover:border-[var(--v-text-secondary)]'"
        >
          <div class="flex items-center space-x-4">
            <div class="w-8 h-8 rounded-lg bg-[var(--v-bg-base)] flex items-center justify-center uppercase text-[10px] font-black" :class="settingsStore.language === lang ? 'text-[var(--v-accent)]' : ''">
              {{ lang }}
            </div>
            <span class="text-sm" :class="settingsStore.language === lang ? 'text-[var(--v-text-primary)]' : 'text-[var(--v-text-secondary)] group-hover:text-[var(--v-text-primary)]'">
              {{ i18n.t('settings.language.' + lang) }}
            </span>
          </div>
          <div v-if="settingsStore.language === lang" class="w-5 h-5 rounded-full bg-[var(--v-accent)] flex items-center justify-center text-[var(--v-bg-base)]">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          </div>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore, LanguageType } from '../../stores/settingsStore'
import { useI18nStore } from '../../stores/i18nStore'

const settingsStore = useSettingsStore()
const i18n = useI18nStore()
</script>
