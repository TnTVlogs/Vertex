<script setup lang="ts">
import { ref, computed } from 'vue'
import { useServerStore } from '../stores/domain/serverStore'
import { useAuthStore } from '../stores/authStore'
import { useI18nStore } from '../stores/i18nStore'
import { useToastStore } from '../stores/toastStore'
import { useNavigationStore } from '../stores/navigationStore'

function formatTimeRemaining(expiresAt: string | null | undefined): string {
  if (!expiresAt) return 'Never expires'
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return 'Expired'
  const days = Math.floor(ms / 86400000)
  const hours = Math.floor((ms % 86400000) / 3600000)
  if (days > 0) return `Expires in ${days}d ${hours}h`
  const minutes = Math.floor((ms % 3600000) / 60000)
  if (hours > 0) return `Expires in ${hours}h ${minutes}m`
  return `Expires in ${minutes}m`
}

function isExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() < Date.now()
}

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits(['close'])

const serverStore = useServerStore()
const authStore = useAuthStore()
const i18n = useI18nStore()
const toastStore = useToastStore()
const navStore = useNavigationStore()

const activeTab = ref<'overview' | 'channels' | 'members' | 'invites'>('overview')

async function handleTabChange(tab: 'overview' | 'channels' | 'members' | 'invites') {
  activeTab.value = tab
  if (tab === 'members' && currentServer.value) {
    await serverStore.fetchMembers(currentServer.value.id)
  }
}

const serverNameConfirm = ref('')
const newChannelName = ref('')
const newChannelType = ref<'text' | 'voice'>('text')
const editingChannelId = ref<string | null>(null)
const editingChannelName = ref('')

const showTransferModal = ref(false)
const selectedMemberForTransfer = ref<any>(null)
const transferConfirmName = ref('')

const currentServer = computed(() => serverStore.currentServer)
const channels = computed(() => serverStore.channels)
const inviteLink = computed(() => {
  const code = currentServer.value?.inviteCode
  if (!code) return ''
  return `https://vertex.sergidalmau.dev/invite/${code}`
})

const selectedExpiry = ref<number | null>(7) // days; null = never

async function handleDeleteServer() {
  if (serverNameConfirm.value.toLowerCase() !== currentServer.value?.name.toLowerCase()) return
  const ok = await serverStore.deleteServer(currentServer.value!.id)
  if (ok) {
    emit('close')
    navStore.setActiveView('home')
  }
}

async function handleCreateChannel() {
  if (!newChannelName.value) return
  const ok = await serverStore.createChannel(currentServer.value!.id, newChannelName.value, newChannelType.value)
  if (ok) {
    newChannelName.value = ''
    newChannelType.value = 'text'
    toastStore.addToast('Frequency channel established', 'success')
  }
}

async function handleUpdateChannel(channelId: string) {
  const ok = await serverStore.updateChannel(currentServer.value!.id, channelId, editingChannelName.value)
  if (ok) editingChannelId.value = null
}

async function handleDeleteChannel(channelId: string) {
  if (confirm('Are you sure you want to delete this channel?')) {
    await serverStore.deleteChannel(currentServer.value!.id, channelId)
  }
}

async function handleGenerateInvite() {
  await serverStore.generateInvite(currentServer.value!.id, selectedExpiry.value)
  toastStore.addToast('New uplink matrix generated', 'success')
}

async function handleRevokeInvite() {
  await serverStore.revokeInvite(currentServer.value!.id)
  toastStore.addToast('Uplink matrix revoked securely', 'info')
}

function copyInvite() {
  if (!inviteLink.value) return
  navigator.clipboard.writeText(inviteLink.value)
  toastStore.addToast('Uplink identifier copied to clipboard', 'success')
}

async function handleKick(userId: string) {
  if (confirm('Are you sure you want to kick this member?')) {
    await serverStore.kickMember(currentServer.value!.id, userId)
    await serverStore.fetchServers() // Refresh member list
  }
}

function openTransferConfirm(member: any) {
  selectedMemberForTransfer.value = member
  showTransferModal.value = true
  transferConfirmName.value = ''
}

async function handleTransferOwnership() {
  if (transferConfirmName.value !== currentServer.value?.name) return
  const ok = await serverStore.transferOwnership(currentServer.value!.id, selectedMemberForTransfer.value.userId)
  if (ok) {
    showTransferModal.value = false
    emit('close') // Close settings since user is no longer owner
  }
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
    <div class="bg-[var(--v-bg-base)] border border-[var(--v-border)] w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden">

      <!-- Mobile tabs (horizontal scroll, top) -->
      <div class="md:hidden flex items-center border-b border-[var(--v-border)] bg-[var(--v-bg-sidebar)] shrink-0">
        <div class="flex flex-1 overflow-x-auto no-scrollbar">
          <button
            v-for="tab in (['overview', 'channels', 'members', 'invites'] as const)"
            :key="tab"
            @click="handleTabChange(tab)"
            class="shrink-0 px-5 py-3.5 text-xs font-black uppercase tracking-wider transition-all border-b-2"
            :class="activeTab === tab ? 'border-[var(--v-accent)] text-[var(--v-accent)]' : 'border-transparent text-[var(--v-text-secondary)]'"
          >
            {{ tab }}
          </button>
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
            :key="tab"
            @click="handleTabChange(tab)"
            class="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all uppercase tracking-wider"
            :class="activeTab === tab ? 'bg-[var(--v-accent)] text-[var(--v-bg-base)] shadow-lg' : 'text-[var(--v-text-secondary)] hover:bg-white/5 hover:text-white'"
          >
            {{ tab }}
          </button>
        </nav>
        <button @click="emit('close')" class="mt-auto px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest text-[var(--v-text-secondary)] transition-all">
          Close Settings
        </button>
      </aside>

      <!-- Content -->
      <main class="flex-1 p-6 md:p-10 overflow-y-auto no-scrollbar relative">
        <!-- Overview -->
        <section v-if="activeTab === 'overview'" class="space-y-10 animate-in slide-in-from-right-4 duration-500">
          <div>
            <h1 class="text-3xl font-black text-white mb-2 uppercase italic tracking-tighter">Server Overview</h1>
            <p class="text-[var(--v-text-secondary)] text-sm font-medium">Manage the core identity of your communication node.</p>
          </div>

          <!-- Danger Zones -->
          <div class="space-y-6">
            <div class="p-6 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-4">
              <h3 class="text-red-500 font-black text-xs uppercase tracking-widest">Delete Server</h3>
              <p class="text-xs text-[var(--v-text-secondary)]">Once you delete a server, there is no going back. All messages, channels, and data will be lost forever.</p>
              <div class="space-y-2">
                <label class="text-[10px] font-bold uppercase text-[var(--v-text-secondary)]">TYPE "{{ currentServer?.name }}" TO CONFIRM</label>
                <input v-model="serverNameConfirm" type="text" class="w-full bg-[var(--v-bg-surface)] border border-[var(--v-border)] rounded-xl px-4 py-2 text-sm outline-none focus:border-red-500 transition-all" />
              </div>
              <button 
                @click="handleDeleteServer" 
                :disabled="serverNameConfirm.toLowerCase() !== currentServer?.name?.toLowerCase()"
                class="w-full py-3 bg-red-500 text-white font-black text-xs uppercase rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-30"
              >
                Permanently Delete Server
              </button>
            </div>
          </div>
        </section>

        <!-- Channels -->
        <section v-if="activeTab === 'channels'" class="space-y-8 animate-in slide-in-from-right-4 duration-500">
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
            <div v-for="channel in channels" :key="channel.id" class="flex items-center justify-between p-4 bg-[var(--v-bg-surface)]/50 rounded-2xl border border-[var(--v-border)] group">
              <div class="flex items-center space-x-3">
                <span class="text-[var(--v-text-secondary)] font-mono opacity-50">#</span>
                <input v-if="editingChannelId === channel.id" v-model="editingChannelName" class="bg-transparent border-b border-[var(--v-accent)] outline-none text-sm font-bold text-white px-1" />
                <span v-else class="text-sm font-black text-white">{{ channel.name }}</span>
                <span class="text-[8px] font-black uppercase text-[var(--v-text-secondary)] px-1.5 py-0.5 bg-white/5 rounded">{{ channel.type }}</span>
              </div>
              <div class="flex space-x-2 md:opacity-0 md:group-hover:opacity-100 transition-all">
                <button v-if="editingChannelId === channel.id" @click="handleUpdateChannel(channel.id)" class="p-2 text-[var(--v-accent)] hover:scale-110"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg></button>
                <button v-else @click="editingChannelId = channel.id; editingChannelName = channel.name" class="p-2 text-[var(--v-text-secondary)] hover:text-white"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button>
                <button @click="handleDeleteChannel(channel.id)" class="p-2 text-red-500 hover:scale-110"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>
              </div>
            </div>
          </div>
        </section>

        <!-- Members -->
        <section v-if="activeTab === 'members'" class="space-y-8 animate-in slide-in-from-right-4 duration-500">
           <h1 class="text-2xl font-black text-white uppercase italic tracking-tighter">Authorized Entities</h1>
           <div class="space-y-3">
             <div v-for="member in serverStore.members" :key="member.id" class="flex items-center justify-between p-4 bg-[var(--v-bg-surface)]/50 rounded-2xl border border-[var(--v-border)] group">
               <div class="flex items-center space-x-4">
                 <div class="w-10 h-10 rounded-xl bg-[var(--v-bg-surface)] border border-[var(--v-border)] flex items-center justify-center font-black">
                   {{ member.username.charAt(0).toUpperCase() }}
                 </div>
                 <div class="flex flex-col">
                   <span class="text-sm font-black text-white">{{ member.username }}</span>
                   <span class="text-[8px] font-black uppercase text-[var(--v-accent)]">{{ member.role }}</span>
                 </div>
               </div>

               <div v-if="member.userId !== authStore.user?.id" class="flex flex-wrap gap-1.5 md:opacity-0 md:group-hover:opacity-100 transition-all">
                 <button @click="openTransferConfirm(member)" class="px-3 py-1.5 bg-yellow-500/10 text-yellow-500 text-[9px] font-black uppercase rounded-lg border border-yellow-500/20 hover:bg-yellow-500 hover:text-black transition-all">Transfer</button>
                 <button @click="handleKick(member.userId)" class="px-3 py-1.5 bg-red-500/10 text-red-500 text-[9px] font-black uppercase rounded-lg border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">Kick</button>
               </div>
             </div>
           </div>
        </section>

        <!-- Invites -->
        <section v-if="activeTab === 'invites'" class="space-y-8 animate-in slide-in-from-right-4 duration-500">
          <h1 class="text-2xl font-black text-white uppercase italic tracking-tighter">Access Protocols</h1>
          
          <div class="p-8 rounded-3xl bg-[var(--v-bg-sidebar)] border border-[var(--v-border)] flex flex-col items-center text-center space-y-6">
            <div class="w-16 h-16 rounded-2xl vertex-gradient flex items-center justify-center text-[var(--v-bg-base)] shadow-xl">
               <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
            </div>
            
            <div v-if="currentServer?.inviteCode" class="w-full space-y-4">
               <div class="flex items-center justify-between">
                 <p class="text-xs font-bold text-[var(--v-text-secondary)] uppercase tracking-[0.2em]">Active Uplink Path</p>
                 <span
                   class="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg"
                   :class="isExpired(currentServer?.inviteExpiresAt)
                     ? 'bg-red-500/10 text-red-500'
                     : currentServer?.inviteExpiresAt
                       ? 'bg-[var(--v-accent)]/10 text-[var(--v-accent)]'
                       : 'bg-white/5 text-[var(--v-text-secondary)]'"
                 >
                   {{ formatTimeRemaining(currentServer?.inviteExpiresAt) }}
                 </span>
               </div>
               <div class="flex items-center bg-[var(--v-bg-surface)] p-2 rounded-2xl border border-[var(--v-border)]">
                 <span class="flex-1 px-4 text-sm font-mono text-[var(--v-accent)] truncate">{{ inviteLink }}</span>
                 <button @click="copyInvite" class="px-4 py-2 bg-[var(--v-accent)] text-[var(--v-bg-base)] font-black text-[10px] rounded-xl uppercase shadow-lg">Copy</button>
               </div>
               <!-- Expiry selector for regeneration -->
               <div class="flex items-center space-x-3">
                 <span class="text-[10px] font-bold uppercase text-[var(--v-text-secondary)]">Regenerate with expiry:</span>
                 <select v-model="selectedExpiry" class="bg-[var(--v-bg-surface)] border border-[var(--v-border)] rounded-lg px-2 py-1 text-[10px] font-bold uppercase outline-none text-white">
                   <option :value="1">1 Day</option>
                   <option :value="7">7 Days</option>
                   <option :value="30">30 Days</option>
                   <option :value="null">Never</option>
                 </select>
               </div>
               <div class="flex items-center justify-center space-x-4">
                 <button @click="handleGenerateInvite" class="text-[10px] font-black uppercase text-[var(--v-accent)] hover:underline">Regenerate Link</button>
                 <span class="text-[var(--v-border)]">|</span>
                 <button @click="handleRevokeInvite" class="text-[10px] font-black uppercase text-red-500 hover:underline">Revoke and Terminate</button>
               </div>
            </div>

            <div v-else class="space-y-4">
               <p class="text-xs text-[var(--v-text-secondary)]">No active invitation protocol found for this server.</p>
               <!-- Expiry selector for first-time generation -->
               <div class="flex items-center justify-center space-x-3">
                 <span class="text-[10px] font-bold uppercase text-[var(--v-text-secondary)]">Expires after:</span>
                 <select v-model="selectedExpiry" class="bg-[var(--v-bg-surface)] border border-[var(--v-border)] rounded-lg px-2 py-1 text-[10px] font-bold uppercase outline-none text-white">
                   <option :value="1">1 Day</option>
                   <option :value="7">7 Days</option>
                   <option :value="30">30 Days</option>
                   <option :value="null">Never</option>
                 </select>
               </div>
               <button @click="handleGenerateInvite" class="px-8 py-3 bg-[var(--v-accent)] text-[var(--v-bg-base)] font-black text-xs rounded-2xl uppercase shadow-xl hover:scale-105 active:scale-95 transition-all">
                 Initialize Invitation Protocol
               </button>
            </div>
          </div>
        </section>
      </main>
    </div>

    <!-- Transfer Ownership Modal -->
    <div v-if="showTransferModal" class="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
       <div class="bg-[var(--v-bg-surface)] border border-[var(--v-border)] p-8 rounded-3xl w-full max-w-md shadow-2xl space-y-6">
          <div class="text-center">
            <h2 class="text-xl font-black text-white uppercase italic tracking-tighter">Transfer Ownership</h2>
            <p class="text-xs text-[var(--v-text-secondary)] mt-2 font-medium leading-relaxed">
               You are about to transfer ownership of <span class="text-white font-bold">{{ currentServer?.name }}</span> to 
               <span class="text-[var(--v-accent)] font-bold">{{ selectedMemberForTransfer?.username }}</span>.
               This action is permanent. You will lose all administrative control.
            </p>
          </div>

          <div class="space-y-3">
             <label class="text-[10px] font-black uppercase text-[var(--v-text-secondary)] tracking-widest">Type "{{ currentServer?.name }}" to confirm transfer</label>
             <input v-model="transferConfirmName" type="text" class="w-full bg-[var(--v-bg-base)] border border-[var(--v-border)] rounded-xl px-4 py-3 text-sm outline-none focus:border-yellow-500 transition-all font-bold" />
          </div>

          <div class="flex space-x-3">
             <button @click="showTransferModal = false" class="flex-1 py-3 bg-white/5 text-[var(--v-text-secondary)] font-black text-xs uppercase rounded-xl hover:bg-white/10 transition-all">Abort</button>
             <button @click="handleTransferOwnership" :disabled="transferConfirmName !== currentServer?.name" class="flex-2 py-3 bg-yellow-500 text-black font-black text-xs uppercase rounded-xl hover:bg-yellow-600 transition-all shadow-xl shadow-yellow-500/20 disabled:opacity-30 px-8">Confirm Transfer</button>
          </div>
       </div>
    </div>
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
.animate-in {
  animation-duration: 0.3s;
  animation-fill-mode: both;
}
</style>
