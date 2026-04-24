<template>
  <div class="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
    <header>
      <h3 class="text-3xl font-black italic uppercase tracking-tighter text-[var(--v-text-primary)]">{{ i18n.t('settings.category.chat') }}</h3>
      <p class="text-[var(--v-text-secondary)] text-xs mt-2 uppercase font-bold tracking-widest">Neural Link Customization</p>
    </header>

    <section class="p-8 bg-[var(--v-bg-surface)] rounded-3xl border border-[var(--v-border)] space-y-8">
      <div class="flex flex-col space-y-4">
        <div class="flex justify-between items-center">
          <div class="flex flex-col">
            <h4 class="text-sm font-black text-[var(--v-text-primary)] uppercase">{{ i18n.t('settings.chat.font_size') }}</h4>
            <p class="text-[10px] text-[var(--v-text-secondary)] font-bold uppercase opacity-50">{{ i18n.t('settings.chat.font_size_desc') }}</p>
          </div>
          <span class="text-xl font-mono font-black text-[var(--v-accent)]">{{ settingsStore.chatFontSize }}px</span>
        </div>
        <input
          type="range" min="10" max="24" step="1"
          v-model.number="settingsStore.chatFontSize"
          class="w-full h-1.5 bg-[var(--v-bg-base)] rounded-lg appearance-none cursor-pointer accent-[var(--v-accent)]"
        />
        <div class="flex justify-between text-[10px] font-black text-[var(--v-text-secondary)] uppercase px-1">
          <span>Minimal</span>
          <span>Optimized</span>
          <span>Enhanced</span>
        </div>
      </div>

      <div class="space-y-3">
        <h4 class="text-[9px] font-black uppercase tracking-widest text-[var(--v-text-secondary)] opacity-40">{{ i18n.t('settings.chat.preview') }}</h4>
        <div class="p-6 bg-[var(--v-bg-base)] border border-[var(--v-border)] rounded-2xl">
          <div class="flex items-end space-x-3">
            <div class="w-8 h-8 rounded-lg bg-[var(--v-bg-surface)] border border-[var(--v-border)] flex items-center justify-center text-[10px] font-black">V</div>
            <div class="flex flex-col max-w-[80%]">
              <div class="bg-[var(--v-accent)] text-white px-3 py-1.5 rounded-2xl rounded-br-sm shadow-lg shadow-[var(--v-accent-glow)]" :style="{ fontSize: `${settingsStore.chatFontSize}px` }">
                {{ i18n.t('settings.chat.preview_text') }}
              </div>
            </div>
          </div>
        </div>
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

<style scoped>
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 18px;
  width: 18px;
  border-radius: 50%;
  background: var(--v-accent);
  cursor: pointer;
  border: 3px solid var(--v-bg-base);
  box-shadow: 0 0 10px var(--v-accent-glow);
  margin-top: -8.5px;
}
input[type=range]::-webkit-slider-runnable-track {
  width: 100%;
  height: 4px;
  cursor: pointer;
  background: var(--v-bg-surface);
  border-radius: 10px;
}
</style>
