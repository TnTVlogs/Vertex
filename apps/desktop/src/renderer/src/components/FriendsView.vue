<template>
  <!-- Friends List View (Online / All) -->
  <div v-if="friendsTab !== 'pending'" class="flex-1 flex flex-col p-8 z-10 overflow-hidden bg-[var(--v-bg-base)]">
    <div class="flex items-baseline justify-between mb-8">
      <h3 class="text-2xl font-black text-white tracking-tight italic uppercase">{{ friendsTab }} CONNECTIONS</h3>
      <span class="text-[var(--v-accent)] font-mono font-bold">{{ filteredFriends.length }}</span>
    </div>

    <div class="flex-1 overflow-y-auto no-scrollbar space-y-3">
      <div v-for="friend in filteredFriends" :key="friend.id"
           @click="emit('openDM', friend.id)"
           class="flex items-center justify-between p-4 bg-[var(--v-bg-surface)]/50 rounded-2xl border border-[var(--v-border)] hover:border-[var(--v-accent)] transition-all group cursor-pointer"
      >
        <div class="flex items-center">
          <div class="relative w-12 h-12 rounded-xl bg-[var(--v-bg-surface)] flex items-center justify-center text-lg font-black mr-4 border border-[var(--v-border)]">
            {{ friend.username.charAt(0).toUpperCase() }}
            <div class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[var(--v-bg-base)]"
                 :class="friend.status === 'online' ? 'bg-[var(--v-accent)]' : 'bg-zinc-600'"></div>
          </div>
          <div class="flex flex-col">
            <span class="text-base font-black text-white group-hover:text-[var(--v-accent)] transition-colors">{{ friend.username }}</span>
            <span class="text-[10px] uppercase font-bold text-[var(--v-text-secondary)] tracking-widest">{{ friend.status }}</span>
          </div>
        </div>
        <div class="flex space-x-2">
          <button class="w-10 h-10 rounded-xl bg-white/5 text-[var(--v-text-secondary)] flex items-center justify-center hover:bg-[var(--v-accent)] hover:text-[var(--v-bg-base)] transition-all">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
          </button>
        </div>
      </div>
      <div v-if="filteredFriends.length === 0" class="flex-1 flex flex-col items-center justify-center pt-20">
        <p class="text-[var(--v-text-secondary)] font-bold italic opacity-30">NO CONNECTIONS FOUND IN THIS SECTOR</p>
      </div>
    </div>
  </div>

  <!-- Pending Requests View -->
  <div v-else class="flex-1 flex flex-col p-8 z-10 overflow-hidden bg-[var(--v-bg-base)]">
    <div class="flex items-baseline justify-between mb-8">
      <h3 class="text-2xl font-black text-white tracking-tight italic">PENDING REQUESTS</h3>
      <span class="text-[var(--v-accent)] font-mono font-bold">{{ friendStore.friendRequests.length }}</span>
    </div>
    <div class="flex-1 overflow-y-auto no-scrollbar space-y-3">
      <div v-for="req in friendStore.friendRequests" :key="req.id" class="flex items-center justify-between p-4 bg-[var(--v-bg-surface)]/50 rounded-2xl border border-[var(--v-border)] hover:border-[var(--v-accent)] transition-all group">
        <div class="flex items-center">
          <div class="w-10 h-10 rounded-xl bg-[var(--v-bg-surface)] flex items-center justify-center text-sm font-black mr-4 border border-[var(--v-border)]">
            {{ (req.direction === 'incoming' ? req.from_username : req.to_username)?.charAt(0)?.toUpperCase() ?? '?' }}
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-black text-white group-hover:text-[var(--v-accent)] transition-colors">
              {{ req.direction === 'incoming' ? req.from_username : req.to_username }}
            </span>
            <span class="text-[10px] uppercase font-bold tracking-widest" :class="req.direction === 'incoming' ? 'text-[var(--v-accent)]' : 'text-[var(--v-text-secondary)]'">
              {{ req.direction === 'incoming' ? 'Incoming Uplink' : 'Awaiting Response' }}
            </span>
          </div>
        </div>
        <div class="flex space-x-2">
          <template v-if="req.direction === 'incoming'">
            <button 
              @click="friendStore.respondToRequest(req.id, 'accepted')" 
              :disabled="friendStore.loadingRequests.has(req.id)"
              class="w-10 h-10 rounded-xl bg-[var(--v-accent)] text-[var(--v-bg-base)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
            >
              <svg v-if="!friendStore.loadingRequests.has(req.id)" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
              <svg v-else class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </button>
            <button 
              @click="friendStore.respondToRequest(req.id, 'declined')" 
              :disabled="friendStore.loadingRequests.has(req.id)"
              class="w-10 h-10 rounded-xl bg-white/5 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg v-if="!friendStore.loadingRequests.has(req.id)" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
              <svg v-else class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </button>
          </template>

          <template v-else>
            <span class="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--v-text-secondary)] bg-white/5 rounded-lg border border-[var(--v-border)]">SENT</span>
          </template>
        </div>
      </div>
      <div v-if="friendStore.friendRequests.length === 0" class="flex-1 flex flex-col items-center justify-center pt-20">
        <p class="text-[var(--v-text-secondary)] font-bold italic opacity-30">NO PENDING UPLINKS FOUND</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFriendStore } from '../stores/domain/friendStore'

const props = defineProps<{
  friendsTab: 'online' | 'all' | 'pending'
}>()

const emit = defineEmits<{
  openDM: [id: string]
}>()

const friendStore = useFriendStore()

const filteredFriends = computed(() => {
  if (props.friendsTab === 'online') {
    return friendStore.friends.filter(f => f.status === 'online')
  }
  return friendStore.friends
})
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
