<template>
  <div class="flex-1 flex flex-col min-[1100px]:flex-row overflow-hidden bg-[var(--v-bg-base)] animate-in fade-in duration-500">

    <!-- Mobile tabs (horizontal scroll) -->
    <div class="min-[1100px]:hidden flex overflow-x-auto no-scrollbar border-b border-[var(--v-border)] shrink-0">
      <button
        v-for="cat in categories"
        :key="cat.id"
        @click="activeCategory = cat.id"
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
        v-for="cat in categories"
        :key="cat.id"
        @click="activeCategory = cat.id"
        class="flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all text-sm font-bold group"
        :class="activeCategory === cat.id
          ? 'bg-[var(--v-accent)] text-[var(--v-bg-base)] shadow-lg shadow-[var(--v-accent-glow)]'
          : 'text-[var(--v-text-secondary)] hover:bg-[var(--v-bg-surface)] hover:text-[var(--v-text-primary)]'"
      >
        <component :is="cat.icon" class="w-4 h-4" />
        <span>{{ i18n.t(cat.label) }}</span>
      </button>
    </div>

    <!-- Category Content -->
    <div class="flex-1 overflow-y-auto no-scrollbar p-6 min-[1100px]:p-10">
      <div class="max-w-2xl mx-auto space-y-12">
        
        <!-- ACCOUNT CATEGORY -->
        <div v-if="activeCategory === 'account'" class="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <header>
             <h3 class="text-3xl font-black italic uppercase tracking-tighter text-[var(--v-text-primary)]">{{ i18n.t('settings.category.account') }}</h3>
             <p class="text-[var(--v-text-secondary)] text-xs mt-2 uppercase font-bold tracking-widest">User Neural Profile</p>
          </header>

          <!-- Avatar + identity -->
          <section class="p-8 bg-[var(--v-bg-surface)] rounded-3xl border border-[var(--v-border)] shadow-xl relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-32 h-32 bg-[var(--v-accent)] opacity-[0.03] blur-3xl rounded-full"></div>
            <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--v-text-secondary)] mb-6">{{ i18n.t('settings.account.identifier') }}</h4>
            <div class="flex items-center space-x-6">
              <!-- Avatar clickable -->
              <div class="relative group/avatar cursor-pointer" @click="triggerAvatarUpload">
                <UserAvatar
                  :username="authStore.user?.username"
                  :avatarUrl="authStore.user?.avatarUrl"
                  size="lg"
                  variant="base"
                />
                <div class="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                  <svg v-if="!avatarUploading" viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M12 16.5l4-4h-3V8h-2v4.5H8l4 4zM20 6h-2.18C17.4 4.84 16.3 4 15 4H9C7.7 4 6.6 4.84 6.18 6H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 13H4V8h4l.83-2h6.34L16 8h4v11z"/></svg>
                  <div v-else class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                <input ref="avatarInput" type="file" accept="image/jpeg,image/png,image/gif,image/webp" class="hidden" @change="handleAvatarChange" />
              </div>
              <div class="flex flex-col space-y-1">
                <span class="text-[10px] font-black text-[var(--v-accent)] uppercase tracking-widest">Active_Uplink</span>
                <span class="text-2xl font-black text-[var(--v-text-primary)]">{{ authStore.user?.username }}</span>
                <span class="text-sm font-bold text-[var(--v-text-secondary)] opacity-60">{{ authStore.user?.email }}</span>
              </div>
            </div>
            <p v-if="avatarError" class="mt-4 text-xs text-red-500 font-bold">{{ avatarError }}</p>
          </section>

          <!-- Edit username -->
          <section class="p-8 bg-[var(--v-bg-surface)] rounded-3xl border border-[var(--v-border)] space-y-4">
            <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--v-text-secondary)]">Display Name</h4>
            <div class="flex space-x-3">
              <input
                v-model="usernameInput"
                type="text"
                maxlength="32"
                placeholder="Username"
                class="flex-1 bg-[var(--v-bg-base)] border border-[var(--v-border)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--v-text-primary)] outline-none focus:border-[var(--v-accent)] transition-colors"
                @keydown.enter="saveUsername"
              />
              <button
                @click="saveUsername"
                :disabled="usernameSaving || usernameInput.trim() === authStore.user?.username"
                class="px-6 py-3 rounded-xl vertex-gradient text-[var(--v-bg-base)] text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
              >
                <span v-if="!usernameSaving">Save</span>
                <div v-else class="w-4 h-4 border-2 border-[var(--v-bg-base)] border-t-transparent rounded-full animate-spin mx-auto"></div>
              </button>
            </div>
            <p v-if="usernameError" class="text-xs text-red-500 font-bold">{{ usernameError }}</p>
            <p v-if="usernameSuccess" class="text-xs text-[#10B981] font-bold">Username updated!</p>
          </section>
        </div>

        <!-- VISUAL CATEGORY -->
        <div v-if="activeCategory === 'visual'" class="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <header>
             <h3 class="text-3xl font-black italic uppercase tracking-tighter text-[var(--v-text-primary)]">{{ i18n.t('settings.category.visual') }}</h3>
             <p class="text-[var(--v-text-secondary)] text-xs mt-2 uppercase font-bold tracking-widest">System Interface Shaders</p>
          </header>

          <section class="space-y-6">
            <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--v-text-secondary)]">{{ i18n.t('settings.visual.theme') }}</h4>
            <div class="grid grid-cols-2 gap-6">
              <!-- Dark Theme -->
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

              <!-- Light Theme -->
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

        <!-- CHAT CATEGORY -->
        <div v-if="activeCategory === 'chat'" class="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
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
                type="range" 
                min="10" 
                max="24" 
                step="1" 
                v-model.number="settingsStore.chatFontSize"
                class="w-full h-1.5 bg-[var(--v-bg-base)] rounded-lg appearance-none cursor-pointer accent-[var(--v-accent)]"
              />
              
              <div class="flex justify-between text-[10px] font-black text-[var(--v-text-secondary)] uppercase px-1">
                <span>Minimal</span>
                <span>Optimized</span>
                <span>Enhanced</span>
              </div>
            </div>

            <!-- Preview box -->
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

        <!-- VOICE CATEGORY -->
        <div v-if="activeCategory === 'voice'" class="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <header>
             <h3 class="text-3xl font-black italic uppercase tracking-tighter text-[var(--v-text-primary)]">{{ i18n.t('settings.category.voice') }}</h3>
             <p class="text-[var(--v-text-secondary)] text-xs mt-2 uppercase font-bold tracking-widest">Acoustic Uplink Core</p>
          </header>

          <section class="p-12 flex flex-col items-center justify-center bg-[var(--v-bg-surface)] rounded-3xl border border-[var(--v-border)] text-center space-y-4">
             <div class="w-16 h-16 rounded-full bg-[var(--v-accent)]/10 flex items-center justify-center text-[var(--v-accent)] mb-2">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
             </div>
             <h4 class="text-xl font-black text-[var(--v-text-primary)] uppercase italic tracking-tighter">{{ i18n.t('settings.voice.upcoming') }}</h4>
             <p class="text-xs font-bold text-[var(--v-text-secondary)] uppercase tracking-widest max-w-xs leading-loose opacity-60">
                {{ i18n.t('settings.voice.desc') }}
             </p>
          </section>
        </div>

        <!-- LANGUAGE CATEGORY -->
        <div v-if="activeCategory === 'language'" class="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
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

        <!-- System Core Version (Always at bottom) -->
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
import UserAvatar from './UserAvatar.vue'
import { useAuthStore } from '../stores/authStore'
import { useSettingsStore, LanguageType } from '../stores/settingsStore'
import { useI18nStore } from '../stores/i18nStore'
import pkg from '../../../../package.json'

// Icons (Using render functions instead of 'template' to avoid runtime compiler issues)
const IconUser = { render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }), h('circle', { cx: '12', cy: '7', r: '4' })]) }
const IconVisual = { render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z' })]) }
const IconChat = { render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' })]) }
const IconVoice = { render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('path', { d: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z' }), h('path', { d: 'M19 10v2a7 7 0 0 1-14 0v-2' }), h('line', { x1: '12', y1: '19', x2: '12', y2: '23' }), h('line', { x1: '8', y1: '23', x2: '16', y2: '23' })]) }
const IconLang = { render: () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [h('circle', { cx: '12', cy: '12', r: '10' }), h('line', { x1: '2', y1: '12', x2: '22', y2: '12' }), h('path', { d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' })]) }

const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const i18n = useI18nStore()
const appVersion = pkg.version

// Profile state
const usernameInput = ref(authStore.user?.username ?? '')
const usernameSaving = ref(false)
const usernameError = ref('')
const usernameSuccess = ref(false)

const avatarInput = ref<HTMLInputElement | null>(null)
const avatarUploading = ref(false)
const avatarError = ref('')

function triggerAvatarUpload() {
  avatarInput.value?.click()
}

async function handleAvatarChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  avatarError.value = ''
  avatarUploading.value = true
  try {
    await authStore.uploadAvatar(file)
  } catch (err: any) {
    avatarError.value = err.message ?? 'Upload failed'
  } finally {
    avatarUploading.value = false
    if (avatarInput.value) avatarInput.value.value = ''
  }
}

async function saveUsername() {
  const val = usernameInput.value.trim()
  if (!val || val === authStore.user?.username) return
  usernameError.value = ''
  usernameSuccess.value = false
  usernameSaving.value = true
  try {
    await authStore.updateProfile(val)
    usernameSuccess.value = true
    setTimeout(() => { usernameSuccess.value = false }, 3000)
  } catch (err: any) {
    usernameError.value = err.message ?? 'Failed to update username'
  } finally {
    usernameSaving.value = false
  }
}

const activeCategory = ref('account')

const categories = [
  { id: 'account', label: 'settings.category.account', icon: markRaw(IconUser) },
  { id: 'visual', label: 'settings.category.visual', icon: markRaw(IconVisual) },
  { id: 'chat', label: 'settings.category.chat', icon: markRaw(IconChat) },
  { id: 'voice', label: 'settings.category.voice', icon: markRaw(IconVoice) },
  { id: 'language', label: 'settings.category.language', icon: markRaw(IconLang) }
]
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Custom range input styling */
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
