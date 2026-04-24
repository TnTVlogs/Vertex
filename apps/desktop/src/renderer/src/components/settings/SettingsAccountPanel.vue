<template>
  <div class="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
    <header>
      <h3 class="text-3xl font-black italic uppercase tracking-tighter text-[var(--v-text-primary)]">{{ i18n.t('settings.category.account') }}</h3>
      <p class="text-[var(--v-text-secondary)] text-xs mt-2 uppercase font-bold tracking-widest">User Neural Profile</p>
    </header>

    <!-- Avatar + identity -->
    <section class="p-8 bg-[var(--v-bg-surface)] rounded-3xl border border-[var(--v-border)] shadow-xl relative overflow-hidden group">
      <div class="absolute top-0 right-0 w-32 h-32 bg-[var(--v-accent)] opacity-[0.03] blur-3xl rounded-full"></div>
      <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--v-text-secondary)] mb-6">{{ i18n.t('settings.account.identifier') }}</h4>
      <div class="flex items-center space-x-6">
        <div class="relative group/avatar cursor-pointer" @click="triggerAvatarUpload">
          <UserAvatar :username="authStore.user?.username" :avatarUrl="authStore.user?.avatarUrl" size="lg" variant="base" />
          <div class="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
            <svg v-if="!avatarUploading" viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M12 16.5l4-4h-3V8h-2v4.5H8l4 4zM20 6h-2.18C17.4 4.84 16.3 4 15 4H9C7.7 4 6.6 4.84 6.18 6H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 13H4V8h4l.83-2h6.34L16 8h4v11z"/></svg>
            <div v-else class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <input ref="avatarInput" type="file" accept="image/jpeg,image/png,image/gif,image/webp" class="hidden" @change="handleAvatarChange" />
        </div>
        <div class="flex flex-col space-y-1">
          <span class="text-[10px] font-black text-[var(--v-accent)] uppercase tracking-widest">Active_Uplink</span>
          <span class="text-2xl font-black text-[var(--v-text-primary)]">{{ authStore.user?.displayName || authStore.user?.username }}</span>
          <span class="text-xs font-bold text-[var(--v-text-secondary)] opacity-50 font-mono">@{{ authStore.user?.username }}</span>
        </div>
      </div>
      <p v-if="avatarError" class="mt-4 text-xs text-red-500 font-bold">{{ avatarError }}</p>
    </section>

    <!-- Edit display name -->
    <section class="p-8 bg-[var(--v-bg-surface)] rounded-3xl border border-[var(--v-border)] space-y-4">
      <div>
        <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--v-text-secondary)]">Display Name</h4>
        <p class="text-[10px] text-[var(--v-text-secondary)] opacity-50 mt-1 uppercase font-bold">Shown in chats. Username (@{{ authStore.user?.username }}) stays fixed.</p>
      </div>
      <div class="flex space-x-3">
        <input
          v-model="displayNameInput"
          type="text"
          maxlength="50"
          :placeholder="authStore.user?.username ?? ''"
          class="flex-1 bg-[var(--v-bg-base)] border border-[var(--v-border)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--v-text-primary)] outline-none focus:border-[var(--v-accent)] transition-colors"
          @keydown.enter="saveDisplayName"
        />
        <button
          @click="saveDisplayName"
          :disabled="saving || displayNameInput.trim() === (authStore.user?.displayName ?? '')"
          class="px-6 py-3 rounded-xl vertex-gradient text-[var(--v-bg-base)] text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
        >
          <span v-if="!saving">Save</span>
          <div v-else class="w-4 h-4 border-2 border-[var(--v-bg-base)] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </button>
      </div>
      <p v-if="saveError" class="text-xs text-red-500 font-bold">{{ saveError }}</p>
      <p v-if="saveSuccess" class="text-xs text-[#10B981] font-bold">Display name updated!</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import UserAvatar from '../UserAvatar.vue'
import { useAuthStore } from '../../stores/authStore'
import { useI18nStore } from '../../stores/i18nStore'

const authStore = useAuthStore()
const i18n = useI18nStore()

const displayNameInput = ref(authStore.user?.displayName ?? '')
const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

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

async function saveDisplayName() {
  const val = displayNameInput.value.trim()
  if (!val || val === (authStore.user?.displayName ?? '')) return
  saveError.value = ''
  saveSuccess.value = false
  saving.value = true
  try {
    await authStore.updateProfile(val)
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 3000)
  } catch (err: any) {
    saveError.value = err.message ?? 'Failed to update display name'
  } finally {
    saving.value = false
  }
}
</script>
