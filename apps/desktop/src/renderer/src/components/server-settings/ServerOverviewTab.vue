<template>
  <section class="space-y-10 animate-in slide-in-from-right-4 duration-500">
    <div>
      <h1 class="text-3xl font-black text-white mb-2 uppercase italic tracking-tighter">Server Overview</h1>
      <p class="text-[var(--v-text-secondary)] text-sm font-medium">Manage the core identity of your communication node.</p>
    </div>

    <div class="space-y-6">
      <div class="p-6 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-4">
        <h3 class="text-red-500 font-black text-xs uppercase tracking-widest">Delete Server</h3>
        <p class="text-xs text-[var(--v-text-secondary)]">Once you delete a server, there is no going back. All messages, channels, and data will be lost forever.</p>
        <div class="space-y-2">
          <label class="text-[10px] font-bold uppercase text-[var(--v-text-secondary)]">TYPE "{{ serverStore.currentServer?.name }}" TO CONFIRM</label>
          <input v-model="serverNameConfirm" type="text" class="w-full bg-[var(--v-bg-surface)] border border-[var(--v-border)] rounded-xl px-4 py-2 text-sm outline-none focus:border-red-500 transition-all" />
        </div>
        <button
          @click="handleDeleteServer"
          :disabled="serverNameConfirm.toLowerCase() !== serverStore.currentServer?.name?.toLowerCase()"
          class="w-full py-3 bg-red-500 text-white font-black text-xs uppercase rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-30"
        >
          Permanently Delete Server
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useServerStore } from '../../stores/domain/serverStore'
import { useNavigationStore } from '../../stores/navigationStore'

const emit = defineEmits<{ close: [] }>()

const serverStore = useServerStore()
const navStore = useNavigationStore()

const serverNameConfirm = ref('')

async function handleDeleteServer() {
  if (serverNameConfirm.value.toLowerCase() !== serverStore.currentServer?.name.toLowerCase()) return
  const ok = await serverStore.deleteServer(serverStore.currentServer!.id)
  if (ok) {
    emit('close')
    navStore.setActiveView('home')
  }
}
</script>
