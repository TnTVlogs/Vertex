<template>
  <div class="flex-1 flex flex-col h-full bg-[var(--v-bg-base)] text-[var(--v-text-primary)] overflow-hidden">
    <!-- Header -->
    <div class="p-4 md:p-8 border-b border-[var(--v-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--v-bg-surface)]/50 shrink-0">
      <div>
        <h2 class="text-xl md:text-2xl font-black text-white italic tracking-tighter">ADMINISTRATION</h2>
        <p class="text-[var(--v-text-secondary)] text-xs font-bold mt-1 uppercase tracking-widest">Global User Management</p>
      </div>
      <div class="flex items-center bg-[var(--v-bg-base)] rounded-xl border border-[var(--v-border)] px-3 py-2 w-full sm:w-auto">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--v-text-secondary)" class="mr-2 shrink-0"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="CERCA USUARIS..."
          class="bg-transparent border-none outline-none text-xs font-bold text-white placeholder-[var(--v-text-secondary)] w-full"
        />
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex-1 flex flex-col items-center justify-center">
       <div class="w-12 h-12 mb-4">
          <div class="w-full h-full rounded-full border-4 border-white/10 border-t-[var(--v-accent)] animate-spin"></div>
       </div>
       <p class="text-[var(--v-text-secondary)] font-bold uppercase tracking-widest text-xs">Carregant Dades...</p>
    </div>

    <div v-else class="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar">

      <!-- ── MOBILE: Card layout ────────────────────────────────── -->
      <div class="md:hidden space-y-3">
        <div v-for="user in filteredUsers" :key="user.id"
             class="bg-[var(--v-bg-surface)] border border-[var(--v-border)] rounded-2xl p-4">
          <!-- User info -->
          <div class="flex items-center mb-4">
            <div class="w-10 h-10 rounded-xl bg-[var(--v-bg-base)] flex items-center justify-center text-sm font-black mr-3 border border-[var(--v-border)] shrink-0">
              {{ user.username.charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-black text-white truncate">{{ user.username }}</p>
              <p class="text-[10px] text-[var(--v-text-secondary)] font-mono truncate">{{ user.email }}</p>
            </div>
            <button 
              @click="deleteUser(user)"
              class="ml-auto p-2 text-[var(--v-text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all shrink-0"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
          <!-- Controls -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <p class="text-[9px] font-black uppercase tracking-widest text-[var(--v-text-secondary)] mb-1.5 px-1">Estat</p>
              <select 
                :value="user.status" 
                @change="(e) => updateStatus(user, (e.target as HTMLSelectElement).value)"
                class="w-full bg-[var(--v-bg-base)] border border-[var(--v-border)] rounded-lg px-2 py-2 text-xs font-bold uppercase tracking-wider outline-none cursor-pointer min-h-[44px]"
                :class="{'text-yellow-500': user.status === 'PENDING', 'text-green-500': user.status === 'ACTIVE', 'text-red-500': user.status === 'BANNED'}"
              >
                <option value="PENDING">PENDING</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="BANNED">BANNED</option>
              </select>
            </div>
            <div>
              <p class="text-[9px] font-black uppercase tracking-widest text-[var(--v-text-secondary)] mb-1.5 px-1">Tier</p>
              <select 
                :value="user.tier" 
                @change="(e) => updateTier(user, (e.target as HTMLSelectElement).value)"
                class="w-full bg-[var(--v-bg-base)] border border-[var(--v-border)] rounded-lg px-2 py-2 text-xs font-bold uppercase tracking-wider outline-none cursor-pointer text-white min-h-[44px]"
              >
                <option value="BASIC">BASIC</option>
                <option value="PRO">PRO</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
          </div>
          <div class="mt-3 px-1">
            <span class="text-[9px] font-mono text-[var(--v-text-secondary)] opacity-60 bg-black/30 px-2 py-1 rounded text-[10px]">IP: {{ user.registration_ip || 'Desconeguda' }}</span>
          </div>
        </div>
        <div v-if="filteredUsers.length === 0" class="text-center py-12 text-[var(--v-text-secondary)] font-bold uppercase tracking-widest text-xs italic">
          Cap usuari trobat.
        </div>
      </div>

      <!-- ── DESKTOP: Table layout ────────────────────────────────── -->
      <div class="hidden md:block bg-[var(--v-bg-surface)] border border-[var(--v-border)] rounded-2xl overflow-hidden shadow-2xl">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr class="bg-black/20 border-b border-[var(--v-border)]">
                <th class="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-[var(--v-text-secondary)]">Usuari</th>
                <th class="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-[var(--v-text-secondary)]">Estat</th>
                <th class="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-[var(--v-text-secondary)]">Tier</th>
                <th class="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-[var(--v-text-secondary)]">IP Registre</th>
                <th class="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-[var(--v-text-secondary)] text-right">Accions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in filteredUsers" :key="user.id" class="border-b border-[var(--v-border)] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td class="py-4 px-6">
                  <div class="flex items-center">
                    <div class="w-8 h-8 rounded-lg bg-[var(--v-bg-base)] flex items-center justify-center text-xs font-black mr-3 border border-[var(--v-border)] shrink-0">
                      {{ user.username.charAt(0).toUpperCase() }}
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="text-sm font-black text-white truncate">{{ user.username }}</span>
                      <span class="text-[10px] text-[var(--v-text-secondary)] font-mono truncate">{{ user.email }}</span>
                    </div>
                  </div>
                </td>
                <td class="py-4 px-6">
                  <select 
                    :value="user.status" 
                    @change="(e) => updateStatus(user, (e.target as HTMLSelectElement).value)"
                    class="bg-[var(--v-bg-base)] border border-[var(--v-border)] rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wider outline-none cursor-pointer transition-colors hover:border-[var(--v-accent)]"
                    :class="{'text-yellow-500': user.status === 'PENDING', 'text-green-500': user.status === 'ACTIVE', 'text-red-500': user.status === 'BANNED'}"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="BANNED">BANNED</option>
                  </select>
                </td>
                <td class="py-4 px-6">
                  <select 
                    :value="user.tier" 
                    @change="(e) => updateTier(user, (e.target as HTMLSelectElement).value)"
                    class="bg-[var(--v-bg-base)] border border-[var(--v-border)] rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wider outline-none cursor-pointer transition-colors hover:border-[var(--v-accent)] text-white"
                  >
                    <option value="BASIC">BASIC</option>
                    <option value="PRO">PRO</option>
                    <option value="VIP">VIP</option>
                  </select>
                </td>
                <td class="py-4 px-6">
                  <span class="text-[10px] font-mono text-[var(--v-text-secondary)] opacity-70 bg-black/30 px-2 py-1 rounded">{{ user.registration_ip || 'Desconeguda' }}</span>
                </td>
                <td class="py-4 px-6 text-right">
                  <button 
                    @click="deleteUser(user)"
                    class="p-2 text-[var(--v-text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Eliminar Usuari"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                  </button>
                </td>
              </tr>
              <tr v-if="filteredUsers.length === 0">
                <td colspan="5" class="py-12 text-center text-[var(--v-text-secondary)] font-bold uppercase tracking-widest text-xs italic">
                  Cap usuari trobat.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ENV } from '../utils/env'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'

const authStore = useAuthStore()
const toastStore = useToastStore()

const users = ref<any[]>([])
const loading = ref(true)
const searchQuery = ref('')

const fetchUsers = async () => {
  try {
    loading.value = true
    const res = await fetch(`${ENV.API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    if (!res.ok) {
      if (res.status === 403) toastStore.addToast('Accés denegat. No ets administrador.', 'error')
      else throw new Error('Error al carregar usuaris')
      return
    }
    users.value = await res.json()
  } catch (err: any) {
    toastStore.addToast(err.message || 'Error', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => { fetchUsers() })

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value
  const q = searchQuery.value.toLowerCase()
  return users.value.filter(u => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.status.toLowerCase().includes(q))
})

const updateStatus = async (user: any, newStatus: string) => {
  try {
    const res = await fetch(`${ENV.API_URL}/admin/users/${user.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` },
      body: JSON.stringify({ status: newStatus })
    })
    if (res.ok) { user.status = newStatus; toastStore.addToast(`${user.username} → ${newStatus}`, 'success') }
    else throw new Error('Error al modificar estat')
  } catch(e: any) { toastStore.addToast(e.message, 'error'); fetchUsers() }
}

const updateTier = async (user: any, newTier: string) => {
  try {
    const res = await fetch(`${ENV.API_URL}/admin/users/${user.id}/tier`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` },
      body: JSON.stringify({ tier: newTier })
    })
    if (res.ok) { user.tier = newTier; toastStore.addToast(`${user.username} → ${newTier}`, 'success') }
    else throw new Error('Error al modificar tier')
  } catch(e: any) { toastStore.addToast(e.message, 'error'); fetchUsers() }
}

const deleteUser = async (user: any) => {
  if (!confirm(`Vols eliminar permanentment l'usuari "${user.username}"? Aquesta acció no es pot desfer.`)) return
  try {
    const res = await fetch(`${ENV.API_URL}/admin/users/${user.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.token}` }
    })
    if (res.ok) { users.value = users.value.filter(u => u.id !== user.id); toastStore.addToast(`${user.username} eliminat`, 'success') }
    else throw new Error('Error a l\'esborrar usuari')
  } catch(e: any) { toastStore.addToast(e.message, 'error') }
}
</script>
<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
