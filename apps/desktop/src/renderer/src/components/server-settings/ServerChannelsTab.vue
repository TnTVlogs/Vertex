<template>
  <section class="space-y-8 animate-in slide-in-from-right-4 duration-500">
    <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
      <h1 class="text-2xl font-black text-white uppercase italic tracking-tighter shrink-0">Frequencies</h1>
      <div class="flex flex-wrap gap-2">
        <input v-model="newChannelName" placeholder="Channel name" class="flex-1 min-w-0 bg-[var(--v-bg-surface)] border border-[var(--v-border)] rounded-xl px-4 py-2 text-xs outline-none" />
        <select v-model="newChannelType" class="bg-[var(--v-bg-surface)] border border-[var(--v-border)] rounded-xl px-2 py-2 text-xs outline-none shrink-0">
          <option value="text">TEXT</option>
          <option value="voice">VOICE</option>
        </select>
        <button @click="handleCreateChannel" class="px-4 py-2 bg-[var(--v-accent)] text-[var(--v-bg-base)] font-black text-[10px] rounded-xl uppercase shrink-0">Create</button>
      </div>
    </div>

    <div class="space-y-2">
      <div v-for="channel in serverStore.channels" :key="channel.id" class="flex items-center justify-between p-4 bg-[var(--v-bg-surface)]/50 rounded-2xl border border-[var(--v-border)] group">
        <div class="flex items-center space-x-3">
          <span class="text-[var(--v-text-secondary)] font-mono opacity-50">#</span>
          <input v-if="editingChannelId === channel.id" v-model="editingChannelName" class="bg-transparent border-b border-[var(--v-accent)] outline-none text-sm font-bold text-white px-1" />
          <span v-else class="text-sm font-black text-white">{{ channel.name }}</span>
          <span class="text-[8px] font-black uppercase text-[var(--v-text-secondary)] px-1.5 py-0.5 bg-white/5 rounded">{{ channel.type }}</span>
        </div>
        <div class="flex space-x-2 md:opacity-0 md:group-hover:opacity-100 transition-all">
          <button v-if="editingChannelId === channel.id" @click="handleUpdateChannel(channel.id)" class="p-2 text-[var(--v-accent)] hover:scale-110">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
          </button>
          <button v-else @click="editingChannelId = channel.id; editingChannelName = channel.name" class="p-2 text-[var(--v-text-secondary)] hover:text-white">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </button>
          <button @click="handleDeleteChannel(channel.id)" class="p-2 text-red-500 hover:scale-110">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useServerStore } from '../../stores/domain/serverStore'
import { useToastStore } from '../../stores/toastStore'

const serverStore = useServerStore()
const toastStore = useToastStore()

const newChannelName = ref('')
const newChannelType = ref<'text' | 'voice'>('text')
const editingChannelId = ref<string | null>(null)
const editingChannelName = ref('')

async function handleCreateChannel() {
  if (!newChannelName.value) return
  const ok = await serverStore.createChannel(serverStore.currentServer!.id, newChannelName.value, newChannelType.value)
  if (ok) {
    newChannelName.value = ''
    newChannelType.value = 'text'
    toastStore.addToast('Frequency channel established', 'success')
  }
}

async function handleUpdateChannel(channelId: string) {
  const ok = await serverStore.updateChannel(serverStore.currentServer!.id, channelId, editingChannelName.value)
  if (ok) editingChannelId.value = null
}

async function handleDeleteChannel(channelId: string) {
  if (confirm('Are you sure you want to delete this channel?')) {
    await serverStore.deleteChannel(serverStore.currentServer!.id, channelId)
  }
}
</script>
