<template>
  <section class="space-y-8 animate-in slide-in-from-right-4 duration-500">
    <h1 class="text-2xl font-black text-white uppercase italic tracking-tighter">Authorized Entities</h1>
    <div class="space-y-3">
      <div v-for="member in serverStore.members" :key="member.id" class="flex items-center justify-between p-4 bg-[var(--v-bg-surface)]/50 rounded-2xl border border-[var(--v-border)] group">
        <div class="flex items-center space-x-4">
          <div class="w-10 h-10 rounded-xl bg-[var(--v-bg-surface)] border border-[var(--v-border)] flex items-center justify-center font-black">
            {{ member.username?.charAt(0).toUpperCase() ?? '?' }}
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

    <!-- Transfer Ownership Modal -->
    <Teleport to="body">
      <div v-if="showTransferModal" class="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
        <div class="bg-[var(--v-bg-surface)] border border-[var(--v-border)] p-8 rounded-3xl w-full max-w-md shadow-2xl space-y-6">
          <div class="text-center">
            <h2 class="text-xl font-black text-white uppercase italic tracking-tighter">Transfer Ownership</h2>
            <p class="text-xs text-[var(--v-text-secondary)] mt-2 font-medium leading-relaxed">
              You are about to transfer ownership of <span class="text-white font-bold">{{ serverStore.currentServer?.name }}</span> to
              <span class="text-[var(--v-accent)] font-bold">{{ selectedMemberForTransfer?.username }}</span>.
              This action is permanent. You will lose all administrative control.
            </p>
          </div>
          <div class="space-y-3">
            <label class="text-[10px] font-black uppercase text-[var(--v-text-secondary)] tracking-widest">Type "{{ serverStore.currentServer?.name }}" to confirm transfer</label>
            <input v-model="transferConfirmName" type="text" class="w-full bg-[var(--v-bg-base)] border border-[var(--v-border)] rounded-xl px-4 py-3 text-sm outline-none focus:border-yellow-500 transition-all font-bold" />
          </div>
          <div class="flex space-x-3">
            <button @click="showTransferModal = false" class="flex-1 py-3 bg-white/5 text-[var(--v-text-secondary)] font-black text-xs uppercase rounded-xl hover:bg-white/10 transition-all">Abort</button>
            <button @click="handleTransferOwnership" :disabled="transferConfirmName !== serverStore.currentServer?.name" class="flex-2 py-3 bg-yellow-500 text-black font-black text-xs uppercase rounded-xl hover:bg-yellow-600 transition-all shadow-xl shadow-yellow-500/20 disabled:opacity-30 px-8">Confirm Transfer</button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useServerStore } from '../../stores/domain/serverStore'
import { useAuthStore } from '../../stores/authStore'
import type { ServerMember } from '@shared/models'

const emit = defineEmits<{ close: [] }>()

const serverStore = useServerStore()
const authStore = useAuthStore()

const showTransferModal = ref(false)
const selectedMemberForTransfer = ref<ServerMember | null>(null)
const transferConfirmName = ref('')

async function handleKick(userId: string) {
  if (confirm('Are you sure you want to kick this member?')) {
    await serverStore.kickMember(serverStore.currentServer!.id, userId)
    await serverStore.fetchServers()
  }
}

function openTransferConfirm(member: ServerMember) {
  selectedMemberForTransfer.value = member
  showTransferModal.value = true
  transferConfirmName.value = ''
}

async function handleTransferOwnership() {
  if (transferConfirmName.value !== serverStore.currentServer?.name) return
  const ok = await serverStore.transferOwnership(serverStore.currentServer!.id, selectedMemberForTransfer.value!.userId)
  if (ok) {
    showTransferModal.value = false
    emit('close')
  }
}
</script>
