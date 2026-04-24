<script setup lang="ts">
import { ref } from 'vue'
import { useServerStore } from '../stores/domain/serverStore'
import ServerOverviewTab from './server-settings/ServerOverviewTab.vue'
import ServerChannelsTab from './server-settings/ServerChannelsTab.vue'
import ServerMembersTab from './server-settings/ServerMembersTab.vue'
import ServerInvitesTab from './server-settings/ServerInvitesTab.vue'

defineProps<{ show: boolean }>()
const emit = defineEmits(['close'])

const serverStore = useServerStore()
const activeTab = ref<'overview' | 'channels' | 'members' | 'invites'>('overview')

async function handleTabChange(tab: 'overview' | 'channels' | 'members' | 'invites') {
  activeTab.value = tab
  if (tab === 'members' && serverStore.currentServer) {
    await serverStore.fetchMembers(serverStore.currentServer.id)
  }
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
    <div class="bg-[var(--v-bg-base)] border border-[var(--v-border)] w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden">

      <!-- Mobile tabs -->
      <div class="md:hidden flex items-center border-b border-[var(--v-border)] bg-[var(--v-bg-sidebar)] shrink-0">
        <div class="flex flex-1 overflow-x-auto no-scrollbar">
          <button
            v-for="tab in (['overview', 'channels', 'members', 'invites'] as const)"
            :key="tab" @click="handleTabChange(tab)"
            class="shrink-0 px-5 py-3.5 text-xs font-black uppercase tracking-wider transition-all border-b-2"
            :class="activeTab === tab ? 'border-[var(--v-accent)] text-[var(--v-accent)]' : 'border-transparent text-[var(--v-text-secondary)]'"
          >{{ tab }}</button>
        </div>
        <button @click="emit('close')" class="shrink-0 p-3 text-[var(--v-text-secondary)] hover:text-white transition-colors">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>

      <!-- Desktop sidebar -->
      <aside class="hidden md:flex w-64 bg-[var(--v-bg-sidebar)] border-r border-[var(--v-border)] p-6 flex-col shrink-0">
        <h2 class="text-xs font-black uppercase tracking-[0.2em] text-[var(--v-text-secondary)] mb-6 opacity-50">Settings</h2>
        <nav class="flex-1 space-y-2">
          <button
            v-for="tab in (['overview', 'channels', 'members', 'invites'] as const)"
            :key="tab" @click="handleTabChange(tab)"
            class="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all uppercase tracking-wider"
            :class="activeTab === tab ? 'bg-[var(--v-accent)] text-[var(--v-bg-base)] shadow-lg' : 'text-[var(--v-text-secondary)] hover:bg-white/5 hover:text-white'"
          >{{ tab }}</button>
        </nav>
        <button @click="emit('close')" class="mt-auto px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest text-[var(--v-text-secondary)] transition-all">
          Close Settings
        </button>
      </aside>

      <!-- Tab content -->
      <main class="flex-1 p-6 md:p-10 overflow-y-auto no-scrollbar relative">
        <ServerOverviewTab v-if="activeTab === 'overview'" @close="emit('close')" />
        <ServerChannelsTab v-else-if="activeTab === 'channels'" />
        <ServerMembersTab v-else-if="activeTab === 'members'" @close="emit('close')" />
        <ServerInvitesTab v-else-if="activeTab === 'invites'" />
      </main>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
