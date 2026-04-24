<template>
  <div class="flex-1 flex flex-col min-[1100px]:flex-row overflow-hidden bg-[var(--v-bg-base)] animate-in fade-in duration-500">

    <!-- Mobile tabs -->
    <div class="min-[1100px]:hidden flex overflow-x-auto no-scrollbar border-b border-[var(--v-border)] shrink-0">
      <button
        v-for="cat in categories" :key="cat.id" @click="activeCategory = cat.id"
        class="shrink-0 flex items-center space-x-2 px-5 py-3.5 text-xs font-black uppercase tracking-wider transition-all border-b-2"
        :class="activeCategory === cat.id ? 'border-[var(--v-accent)] text-[var(--v-accent)]' : 'border-transparent text-[var(--v-text-secondary)]'"
      >
        <component :is="cat.icon" class="w-4 h-4" />
        <span>{{ i18n.t(cat.label) }}</span>
      </button>
    </div>

    <!-- Desktop sidebar -->
    <div class="hidden min-[1100px]:flex w-64 border-r border-[var(--v-border)] flex-col p-6 space-y-2 shrink-0">
      <h2 class="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--v-text-secondary)] mb-6 px-3">
        {{ i18n.t('settings.title') }}
      </h2>
      <button
        v-for="cat in categories" :key="cat.id" @click="activeCategory = cat.id"
        class="flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all text-sm font-bold group"
        :class="activeCategory === cat.id
          ? 'bg-[var(--v-accent)] text-[var(--v-bg-base)] shadow-lg shadow-[var(--v-accent-glow)]'
          : 'text-[var(--v-text-secondary)] hover:bg-[var(--v-bg-surface)] hover:text-[var(--v-text-primary)]'"
      >
        <component :is="cat.icon" class="w-4 h-4" />
        <span>{{ i18n.t(cat.label) }}</span>
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto no-scrollbar p-6 min-[1100px]:p-10">
      <div class="max-w-2xl mx-auto space-y-12">
        <SettingsAccountPanel v-if="activeCategory === 'account'" />
        <SettingsVisualPanel v-else-if="activeCategory === 'visual'" />
        <SettingsChatPanel v-else-if="activeCategory === 'chat'" />
        <SettingsVoicePanel v-else-if="activeCategory === 'voice'" />
        <SettingsLanguagePanel v-else-if="activeCategory === 'language'" />

        <footer class="pt-12 border-t border-[var(--v-border)]">
          <div class="flex items-center justify-between p-6 bg-red-500/10 border border-red-500/20 rounded-3xl text-red-500/60 transition-all hover:bg-red-500/20 hover:text-red-500">
            <div class="flex flex-col">
              <span class="text-[9px] font-black tracking-[0.3em] uppercase mb-1">System Core Diagnostics</span>
              <span class="text-xs font-bold tracking-widest uppercase">Kernel Binary Version</span>
            </div>
            <span class="text-xl font-mono font-black italic">v{{ appVersion }}-STABLE</span>
          </div>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, markRaw, h } from 'vue'
import { useI18nStore } from '../stores/i18nStore'
import SettingsAccountPanel from './settings/SettingsAccountPanel.vue'
import SettingsVisualPanel from './settings/SettingsVisualPanel.vue'
import SettingsChatPanel from './settings/SettingsChatPanel.vue'
import SettingsVoicePanel from './settings/SettingsVoicePanel.vue'
import SettingsLanguagePanel from './settings/SettingsLanguagePanel.vue'
import pkg from '../../../../package.json'

const i18n = useI18nStore()
const appVersion = pkg.version
const activeCategory = ref('account')

const IconUser = { render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }), h('circle', { cx: '12', cy: '7', r: '4' })]) }
const IconVisual = { render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z' })]) }
const IconChat = { render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' })]) }
const IconVoice = { render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z' }), h('path', { d: 'M19 10v2a7 7 0 0 1-14 0v-2' }), h('line', { x1: '12', y1: '19', x2: '12', y2: '23' }), h('line', { x1: '8', y1: '23', x2: '16', y2: '23' })]) }
const IconLang = { render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('circle', { cx: '12', cy: '12', r: '10' }), h('line', { x1: '2', y1: '12', x2: '22', y2: '12' }), h('path', { d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' })]) }

const categories = [
  { id: 'account', label: 'settings.category.account', icon: markRaw(IconUser) },
  { id: 'visual', label: 'settings.category.visual', icon: markRaw(IconVisual) },
  { id: 'chat', label: 'settings.category.chat', icon: markRaw(IconChat) },
  { id: 'voice', label: 'settings.category.voice', icon: markRaw(IconVoice) },
  { id: 'language', label: 'settings.category.language', icon: markRaw(IconLang) },
]
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
