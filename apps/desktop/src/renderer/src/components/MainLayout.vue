<script setup lang="ts">
import { useAuthStore } from '../stores/authStore'
import { useNavigationStore } from '../stores/navigationStore'
import { useChatStore } from '../stores/chatStore'
import { useServerStore } from '../stores/domain/serverStore'
import { useI18nStore } from '../stores/i18nStore'
import { useToastStore } from '../stores/toastStore'
import { useUiStore } from '../stores/uiStore'
import { ENV } from '../utils/env'
import { onMounted, ref, computed } from 'vue'
import Chat from '../components/Chat.vue'
import Modal from '../components/Modal.vue'
import Settings from '../components/Settings.vue'
import ServerSettingsModal from '../components/ServerSettingsModal.vue'
import AdminDashboard from '../components/AdminDashboard.vue'
import FriendsView from '../components/FriendsView.vue'
import UserAvatar from '../components/UserAvatar.vue'

const authStore = useAuthStore()
const navStore = useNavigationStore()
const uiStore = useUiStore()
const chatStore = useChatStore()
const serverStore = useServerStore()
const i18n = useI18nStore()
const toastStore = useToastStore()

const friendsTab = ref<'online' | 'all' | 'pending'>('online')
const showAddFriendModal = ref(false)
const isAddingFriend = ref(false)
const showCreateServerModal = ref(false)
const isPerformingServerAction = ref(false)
const serverActionTab = ref<'create' | 'join'>('create')
const showServerSettingsModal = ref(false)

// Persistence: save last visited channel per server
const LAST_CHANNELS_KEY = 'vertex_last_visited_channels'

function saveLastChannel(serverId: string, channelId: string) {
  const data = JSON.parse(localStorage.getItem(LAST_CHANNELS_KEY) || '{}')
  data[serverId] = channelId
  localStorage.setItem(LAST_CHANNELS_KEY, JSON.stringify(data))
}

function getLastChannel(serverId: string): string | null {
  const data = JSON.parse(localStorage.getItem(LAST_CHANNELS_KEY) || '{}')
  return data[serverId] || null
}

// Sync store on navigation
function openDM(recipientId: string) {
  if (navStore.activeRecipientId === recipientId && navStore.activeView === 'home') return
  uiStore.closeAll() // Close mobile sidebar on navigation
  navStore.setDM(recipientId)
  chatStore.clearMessages()
}

function openChannel(serverId: string, channelId: string) {
  // Include serverId in guard so switching servers with same channelId still navigates
  if (navStore.activeChannelId === channelId && navStore.activeServerId === serverId && navStore.activeView === 'server') return
  uiStore.closeAll()
  navStore.setServer(serverId, channelId)
  chatStore.clearMessages()
  saveLastChannel(serverId, channelId)
}

async function handleServerClick(serverId: string) {
  // Already on this server — do nothing
  if (navStore.activeServerId === serverId && navStore.activeView === 'server') return

  // Clear stale channels immediately so the sidebar doesn't show the old server's channels
  serverStore.clearChannels()

  const lastId = getLastChannel(serverId)

  if (lastId) {
    openChannel(serverId, lastId)
    // Refresh channels list in background (sidebar update)
    chatStore.fetchChannels(serverId)
    return
  }

  // No history — must fetch first to find a channel to open
  await chatStore.fetchChannels(serverId)
  const channels = chatStore.channels

  if (channels && channels.length > 0) {
    openChannel(serverId, channels[0].id)
  } else {
    navStore.setServer(serverId)
  }
}

onMounted(async () => {
  chatStore.connect()
  
  await Promise.all([
    chatStore.fetchFriends(),
    chatStore.fetchServers(),
    chatStore.fetchRequests()
  ])
})

const handleLogout = () => {
  authStore.logout()
}

const onAddFriend = async (username: string) => {
  if (!username) return
  const res = await fetch(`${ENV.API_URL}/social/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromId: authStore.user?.id, toUsername: username })
  })
  if (res.ok) {
    showAddFriendModal.value = false
    toastStore.addToast('Uplink request transmitted successfully', 'success')
    // Refresh pending list for both sender state and display
    if (typeof chatStore.fetchRequests === 'function') await chatStore.fetchRequests()
  } else {
    const data = await res.json()
    toastStore.addToast(data.error || 'Failed to send request', 'error')
  }
}

const onServerAction = async (value: string) => {
  if (!value) return
  
  if (serverActionTab.value === 'create') {
    const res = await fetch(`${ENV.API_URL}/servers/create`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ name: value, ownerId: authStore.user?.id })
    })
    if (res.ok) {
      await chatStore.fetchServers()
      showCreateServerModal.value = false
      toastStore.addToast('Communication node initialized', 'success')
    } else {
      toastStore.addToast('Failed to initialize node', 'error')
    }
  } else {
    try {
      const ok = await serverStore.joinServer(value)
      if (ok) {
        showCreateServerModal.value = false
        // The store handles the success toast
      }
    } catch (e: any) {
      // The store handles the error toast
    }
  }
}
</script>

<template>
  <div class="relative flex h-screen w-screen bg-[var(--v-bg-base)] text-[var(--v-text-primary)] overflow-hidden font-sans">
    <!-- Mobile Backdrop -->
    <div
      v-if="uiStore.isLeftSidebarOpen"
      @click="uiStore.closeAll()"
      class="fixed inset-0 bg-black/50 z-30 md:hidden"
    />
    <!-- Slim Action Bar -->
    <nav class="hidden md:flex w-16 flex-col items-center py-4 bg-[var(--v-bg-sidebar)] border-r border-[var(--v-border)] z-20 shrink-0">
      <div 
        @click="navStore.setActiveView('home')"
        class="group relative flex items-center justify-center w-10 h-10 mb-6 transition-all duration-300 cursor-pointer"
        :class="navStore.activeView === 'home' || navStore.activeView === 'friends' ? 'text-[var(--v-accent)]' : 'text-[var(--v-text-secondary)] hover:text-white'"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
        <div v-if="navStore.activeView === 'home' || navStore.activeView === 'friends'" class="absolute -left-4 w-1 h-6 bg-[var(--v-accent)] rounded-r shadow-[0_0_10px_var(--v-accent)]"></div>
      </div>

      <div class="flex flex-col items-center space-y-4 flex-1 overflow-y-auto no-scrollbar w-full">
        <div v-for="server in chatStore.servers" :key="server.id"
             @click="handleServerClick(server.id)"
             class="group relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 cursor-pointer overflow-hidden border border-transparent shadow-lg"
             :class="navStore.activeServerId === server.id ? 'border-[var(--v-accent)] bg-[var(--v-bg-surface)] scale-110' : 'bg-[var(--v-bg-surface)] hover:scale-105'"
        >
          <span class="font-bold text-xs" :class="navStore.activeServerId === server.id ? 'text-[var(--v-accent)]' : 'text-[var(--v-text-secondary)] group-hover:text-white'">
            {{ server.name.charAt(0).toUpperCase() }}
          </span>
          <div v-if="navStore.activeServerId === server.id" class="absolute -left-4 w-1 h-6 bg-[var(--v-accent)] rounded-r shadow-[0_0_10px_var(--v-accent)]"></div>
        </div>

        <button 
          @click="showCreateServerModal = true"
          class="w-10 h-10 rounded-xl bg-[var(--v-bg-surface)] flex items-center justify-center text-[var(--v-text-secondary)] hover:text-[var(--v-accent)] hover:border-[var(--v-accent)] border border-transparent transition-all duration-300"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        </button>
      </div>

      <div class="mt-auto flex flex-col items-center space-y-6 pt-4 border-t border-[var(--v-border)] w-full">
        <button
          v-if="authStore.user?.isAdmin"
          @click="navStore.setActiveView('admin')"
          class="transition-colors group"
          :class="navStore.activeView === 'admin' ? 'text-[var(--v-accent)]' : 'text-[var(--v-text-secondary)] hover:text-red-400'"
          title="Admin Dashboard"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
        </button>
        <button 
          @click="navStore.setActiveView('settings')"
          class="transition-colors group"
          :class="navStore.activeView === 'settings' ? 'text-[var(--v-accent)]' : 'text-[var(--v-text-secondary)] hover:text-[var(--v-text-primary)]'"
          title="Settings"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>
        </button>
        <div class="relative group cursor-pointer">
          <UserAvatar
            :username="authStore.user?.username"
            size="xs"
            variant="accent"
            :online="true"
          />
        </div>
      </div>
    </nav>

    <!-- Contextual Explorer - Desktop static, Mobile slide-in drawer -->
    <aside
      class="fixed inset-y-0 left-0 z-40 w-72 flex flex-col glass shadow-2xl transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:w-64 md:shrink-0"
      :class="{ '-translate-x-full': !uiStore.isLeftSidebarOpen }"
    >
      <div class="h-16 flex items-center justify-between px-6 border-b border-[var(--v-border)] shrink-0">
        <h2 class="font-black text-lg tracking-tight text-white italic">VERTEX</h2>
        <!-- Close button (mobile only) -->
        <button @click="uiStore.closeAll()" class="md:hidden p-1 text-[var(--v-text-secondary)] hover:text-white transition-colors">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
        </button>
      </div>

      <!-- Mobile server switcher (only visible on mobile since nav is hidden) -->
      <div class="md:hidden flex items-center space-x-3 px-4 py-3 border-b border-[var(--v-border)] overflow-x-auto no-scrollbar shrink-0">
        <button
          @click="navStore.setActiveView('home'); uiStore.closeAll()"
          class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all"
          :class="navStore.activeView === 'home' || navStore.activeView === 'friends' ? 'text-[var(--v-accent)] bg-[var(--v-bg-surface)]' : 'text-[var(--v-text-secondary)] bg-[var(--v-bg-surface)]'"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </button>
        <div v-for="server in chatStore.servers" :key="server.id"
             @click="handleServerClick(server.id)"
             class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all cursor-pointer"
             :class="navStore.activeServerId === server.id ? 'border-[var(--v-accent)] bg-[var(--v-bg-surface)] text-[var(--v-accent)]' : 'border-transparent bg-[var(--v-bg-surface)] text-[var(--v-text-secondary)]'"
        >
          <span class="font-bold text-xs">{{ server.name.charAt(0).toUpperCase() }}</span>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto py-6 px-4 space-y-8 no-scrollbar">
        <template v-if="navStore.activeView === 'settings'">
          <section>
             <h3 class="px-3 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--v-text-secondary)] opacity-50">{{ i18n.t('settings.category.accessibility') }}</h3>
             <div class="flex items-center px-3 py-2.5 rounded-xl cursor-default bg-[var(--v-accent)] text-[var(--v-bg-base)] font-bold shadow-[0_4px_15px_var(--v-accent-glow)]">
               <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" class="mr-3"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>
               {{ i18n.t('sidebar.settings') }}
             </div>
          </section>
        </template>

        <template v-if="navStore.activeView === 'admin'">
          <section>
             <h3 class="px-3 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--v-text-secondary)] opacity-50">Administration</h3>
             <div class="flex items-center px-3 py-2.5 rounded-xl cursor-default bg-red-500/20 text-red-400 font-bold shadow-[0_4px_15px_rgba(248,113,113,0.1)] border border-red-500/30">
               <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" class="mr-3"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
               Users & Tiers
             </div>
          </section>
        </template>

        <template v-else-if="navStore.activeView === 'home' || navStore.activeView === 'friends'">
          <section>
             <div @click="navStore.setActiveView('friends')" 
                  class="flex items-center px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 group"
                  :class="(navStore.activeView === 'friends' || (navStore.activeView === 'home' && !navStore.activeRecipientId)) ? 'bg-[var(--v-accent)] text-[var(--v-bg-base)] font-bold shadow-[0_4px_15px_var(--v-accent-glow)]' : 'text-[var(--v-text-secondary)] hover:bg-white/5 hover:text-[var(--v-text-primary)]'"
             >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" class="mr-3">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
              {{ i18n.t('sidebar.friends') }}
            </div>
          </section>

          <section>
            <h3 class="px-3 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--v-text-secondary)] opacity-50">Direct Messages</h3>
            <div class="space-y-1">
              <div v-for="friend in chatStore.friends" :key="friend.id"
                   @click="openDM(friend.id)"
                   class="flex items-center px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 group"
                   :class="navStore.activeRecipientId === friend.id ? 'bg-white/10 text-white shadow-sm' : 'text-[var(--v-text-secondary)] hover:bg-white/5 hover:text-white'"
              >
                <div class="relative mr-3 w-8 h-8 rounded-lg bg-[var(--v-bg-surface)] flex items-center justify-center shrink-0 border border-[var(--v-border)]">
                  <span class="text-xs font-bold">{{ friend.username.charAt(0).toUpperCase() }}</span>
                  <div class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--v-bg-sidebar)]"
                       :class="friend.status === 'online' ? 'bg-[var(--v-accent)]' : 'bg-zinc-600'"></div>
                </div>
                <span class="text-sm truncate font-medium">{{ friend.username }}</span>
              </div>
            </div>
          </section>
        </template>

        <template v-else-if="navStore.activeServerId">
           <section>
             <h3 class="px-3 mb-4 text-white font-bold text-sm tracking-tight flex items-center justify-between">
               {{ chatStore.servers.find(s => s.id === navStore.activeServerId)?.name }}
               <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" class="opacity-50"><path d="M7 10l5 5 5-5z"/></svg>
             </h3>
             <div class="space-y-1">
               <div v-for="channel in chatStore.channels" :key="channel.id"
                    @click="openChannel(navStore.activeServerId!, channel.id)"
                    class="flex items-center px-3 py-2 rounded-xl cursor-pointer transition-all duration-200"
                    :class="navStore.activeChannelId === channel.id ? 'bg-[var(--v-accent)] text-[var(--v-bg-base)] font-bold shadow-[0_4px_15px_var(--v-accent-glow)]' : 'text-[var(--v-text-secondary)] hover:bg-white/5 hover:text-white'"
               >
                 <span class="mr-2 opacity-50 font-mono">#</span>
                 <span class="text-sm truncate">{{ channel.name }}</span>
               </div>
             </div>
           </section>
        </template>
      </div>

      <div class="p-4 mt-auto border-t border-[var(--v-border)] space-y-1">
        <!-- Settings / Admin (mobile only — desktop has the action bar) -->
        <div class="md:hidden flex space-x-1 mb-1">
          <button
            @click="navStore.setActiveView('settings'); uiStore.closeAll()"
            class="flex-1 flex items-center justify-center px-3 py-2 rounded-xl transition-colors text-xs font-bold uppercase tracking-wider"
            :class="navStore.activeView === 'settings' ? 'bg-[var(--v-accent)] text-[var(--v-bg-base)]' : 'text-[var(--v-text-secondary)] hover:bg-white/5 hover:text-white'"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" class="mr-2"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>
            Settings
          </button>
          <button
            v-if="authStore.user?.isAdmin"
            @click="navStore.setActiveView('admin'); uiStore.closeAll()"
            class="flex items-center justify-center px-3 py-2 rounded-xl transition-colors text-xs font-bold uppercase tracking-wider"
            :class="navStore.activeView === 'admin' ? 'bg-red-500/20 text-red-400' : 'text-[var(--v-text-secondary)] hover:bg-white/5 hover:text-red-400'"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
          </button>
        </div>
        <button @click="handleLogout" class="w-full flex items-center px-3 py-2 text-red-400 hover:bg-red-400/10 rounded-xl transition-colors text-xs font-bold uppercase tracking-wider">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" class="mr-3"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
          Logout Session
        </button>
      </div>
    </aside>

    <!-- Main Workspace -->
    <main class="flex-1 flex flex-col min-w-0 bg-[var(--v-bg-base)]">
      <!-- Dynamic Header -->
      <header class="h-16 flex items-center px-4 md:px-8 shrink-0 z-10">
        <!-- Hamburger (mobile only): opens the channel/server sidebar -->
        <button
          @click="uiStore.toggleLeftSidebar()"
          class="md:hidden flex items-center justify-center w-10 h-10 mr-1 text-[var(--v-text-secondary)] hover:text-white transition-colors shrink-0"
          aria-label="Open menu"
        >
          <svg v-if="!uiStore.isLeftSidebarOpen" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
          <svg v-else viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
        </button>

        <div v-if="(navStore.activeView === 'friends' || navStore.activeView === 'home') && !navStore.activeRecipientId" class="flex-1 flex items-center justify-between min-w-0">
          <div class="flex items-center space-x-2 md:space-x-6 min-w-0">
            <h2 class="text-lg font-black text-white hidden sm:block">Network</h2>
            <div class="flex items-center space-x-1 bg-[var(--v-bg-surface)] p-1 rounded-xl border border-[var(--v-border)]">
              <button 
                v-for="tab in (['online', 'all', 'pending'] as const)" :key="tab"
                @click="friendsTab = tab"
                class="px-2 md:px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                :class="friendsTab === tab ? 'bg-[var(--v-accent)] text-[var(--v-bg-base)] shadow-lg' : 'text-[var(--v-text-secondary)] hover:text-white'"
              >
                {{ tab.toUpperCase() }}
              </button>
            </div>
          </div>
          <button 
            @click="showAddFriendModal = true"
            class="vertex-gradient text-[var(--v-bg-base)] px-3 md:px-5 py-2 rounded-xl text-xs font-black shadow-lg hover:scale-105 active:scale-95 transition-all shrink-0"
          >
            <span class="hidden sm:inline">ADD CONNECTION</span>
            <svg class="sm:hidden" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          </button>
        </div>

        <div v-else class="flex-1 flex items-center justify-between min-w-0">
          <div class="flex items-center min-w-0">
            <span class="text-[var(--v-accent)] text-xl font-mono mr-2 opacity-80 shrink-0">/</span>
            <h2 class="text-lg font-black text-white truncate">
              {{ navStore.activeChannelId ? chatStore.channels.find(c => c.id === navStore.activeChannelId)?.name : (navStore.activeRecipientId ? chatStore.friends.find(f => f.id === navStore.activeRecipientId)?.username : 'Workspace') }}
            </h2>
          </div>
          <div class="flex items-center space-x-2 md:space-x-4 shrink-0">
             <button v-if="serverStore.isOwner" @click="showServerSettingsModal = true" class="text-[var(--v-text-secondary)] hover:text-[var(--v-accent)] transition-colors p-1">
               <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>
             </button>
             <button class="text-[var(--v-text-secondary)] hover:text-white p-1"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg></button>
          </div>
        </div>
      </header>
      
      <!-- Content Area -->
      <div class="flex-1 overflow-hidden p-2 md:p-6">
        <div class="h-full w-full glass rounded-3xl overflow-hidden shadow-inner relative flex flex-col">
          <!-- Active Chat View -->
          <Chat v-if="navStore.activeView !== 'settings' && navStore.activeView !== 'admin' && (navStore.activeRecipientId || navStore.activeChannelId)" />
          
          <!-- Configuration Settings View -->
          <Settings v-else-if="navStore.activeView === 'settings'" />

          <!-- Admin Dashboard View -->
          <AdminDashboard v-else-if="navStore.activeView === 'admin'" />

          <!-- Friends View (Online / All / Pending) -->
          <FriendsView
            v-else-if="(navStore.activeView === 'friends' || navStore.activeView === 'home') && !navStore.activeRecipientId"
            :friends-tab="friendsTab"
            @open-d-m="openDM"
          />
          
          <!-- Default Empty State -->
          <div v-else class="flex-1 flex flex-col items-center justify-center p-12 text-center animate-pulse">
            <div class="w-24 h-24 rounded-[2rem] vertex-gradient flex items-center justify-center mb-8 shadow-[0_10px_40px_rgba(16,185,129,0.3)]">
               <svg viewBox="0 0 24 24" width="48" height="48" fill="var(--v-bg-base)">
                 <path d="M13 2L3 14h9l-1 8L21 10h-9l1-8z"/>
               </svg>
            </div>
            <h2 class="text-3xl font-black text-white mb-4 tracking-tighter">SELECT A FREQUENCY</h2>
            <p class="text-[var(--v-text-secondary)] max-w-xs leading-relaxed font-medium">Select a server or direct message from the explorer to begin communication.</p>
          </div>
        </div>
      </div>
    </main>

    <!-- Modals -->
    <Modal 
      :title="serverActionTab === 'create' ? 'INITIALIZE SERVER' : 'JOIN SERVER'" 
      :label="serverActionTab === 'create' ? 'Server Identifier' : 'Invitation Code'" 
      :show="showCreateServerModal" 
      :loading="isPerformingServerAction"
      @close="showCreateServerModal = false"
      @confirm="onServerAction"
    >
      <template #description>
        <div class="flex p-1 bg-black/20 rounded-xl mb-6">
          <button 
            @click="serverActionTab = 'create'"
            :disabled="isPerformingServerAction"
            class="flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all disabled:opacity-50"
            :class="serverActionTab === 'create' ? 'bg-[var(--v-accent)] text-[var(--v-bg-base)]' : 'text-[var(--v-text-secondary)] hover:text-white'"
          >
            Create
          </button>
          <button 
            @click="serverActionTab = 'join'"
            :disabled="isPerformingServerAction"
            class="flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all disabled:opacity-50"
            :class="serverActionTab === 'join' ? 'bg-[var(--v-accent)] text-[var(--v-bg-base)]' : 'text-[var(--v-text-secondary)] hover:text-white'"
          >
            Join
          </button>
        </div>
        <p class="text-[var(--v-text-secondary)] text-center text-xs mb-6 font-bold uppercase tracking-widest leading-relaxed">
          {{ serverActionTab === 'create' ? 'Establish a new encrypted communication node.' : 'Enter an invitation code to link with an existing node.' }}
        </p>
      </template>
    </Modal>

    <Modal 
      title="UPLINK REQUEST" 
      label="Username Handle" 
      :show="showAddFriendModal" 
      :loading="isAddingFriend"
      @close="showAddFriendModal = false"
      @confirm="onAddFriend"
    >
      <template #description>
        <p class="text-[var(--v-text-secondary)] text-center text-xs mb-6 font-bold uppercase tracking-widest">Connect to another user endpoint.</p>
      </template>
    </Modal>

    <ServerSettingsModal 
      :show="showServerSettingsModal" 
      @close="showServerSettingsModal = false"
    />
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
