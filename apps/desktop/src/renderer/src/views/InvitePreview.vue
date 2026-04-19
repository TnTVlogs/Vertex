<template>
  <div class="relative flex items-center justify-center min-h-screen bg-[var(--v-bg-base)] text-white overflow-hidden p-6 selection:bg-[var(--v-accent)] selection:text-[var(--v-bg-base)]">
    <!-- Dynamic Background Accents -->
    <div class="absolute top-0 left-0 w-[40%] h-[40%] bg-[var(--v-accent)] opacity-[0.05] blur-[120px] rounded-full"></div>
    <div class="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-[var(--v-accent)] opacity-[0.08] blur-[150px] rounded-full"></div>
    
    <!-- Invite Card -->
    <div class="w-full max-w-[440px] z-10 animate-in fade-in zoom-in duration-700">
      
      <!-- Loading State -->
      <div v-if="loading" class="glass p-10 rounded-3xl shadow-2xl flex flex-col items-center justify-center text-center">
         <div class="w-12 h-12 mb-4">
            <div class="w-full h-full rounded-full border-4 border-white border-opacity-10 border-t-[var(--v-accent)] animate-spin"></div>
         </div>
         <p class="text-[var(--v-text-secondary)] font-bold uppercase tracking-widest text-xs">Cercant Invitació...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="glass p-10 rounded-3xl shadow-2xl relative overflow-hidden text-center">
         <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)] mb-6">
           <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
           </svg>
         </div>
         <h2 class="text-2xl font-black italic tracking-tighter text-white mb-2">Invitació Invàlida</h2>
         <p class="text-[var(--v-text-secondary)] text-sm mb-8">{{ error }}</p>
         <button @click="returnToApp" class="w-full bg-[var(--v-bg-surface)] hover:bg-white/5 border border-[var(--v-border)] text-white font-black py-4 rounded-2xl transition-all text-xs tracking-[0.2em] uppercase">
            Tornar a Vertex
         </button>
      </div>

      <!-- Success Preview State -->
      <div v-else-if="preview" class="glass p-10 rounded-3xl shadow-2xl relative overflow-hidden group">
         <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[var(--v-bg-surface)] border border-[var(--v-border)] shadow-xl mb-6">
                <!-- Placeholder per l'escut del servidor -->
                 <span class="text-3xl font-black text-[var(--v-text-secondary)] uppercase">{{ preview.name.substring(0, 2) }}</span>
            </div>
            
            <p class="text-[var(--v-text-secondary)] text-xs font-bold uppercase tracking-widest mb-2">Has estat invitat a unir-te a</p>
            <h1 class="text-3xl font-black tracking-tight text-white mb-4">{{ preview.name }}</h1>
            
            <div class="flex items-center justify-center space-x-6 text-[11px] font-bold uppercase tracking-wider text-[var(--v-text-secondary)]">
                <div class="flex items-center">
                    <span class="w-2 h-2 rounded-full bg-[var(--v-accent)] mr-2 shadow-[0_0_8px_var(--v-accent)] animate-pulse"></span>
                    Membres actius: {{ preview.memberCount }}
                </div>
                <div v-if="preview.expiresAt" class="flex items-center">
                    <svg class="w-3 h-3 mr-1.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                    </svg>
                    {{ formatTimeRemaining(preview.expiresAt) }}
                </div>
            </div>
         </div>

         <button 
            @click="handleAccept" 
            :disabled="processing"
            class="w-full vertex-gradient text-[var(--v-bg-base)] font-black py-4 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all text-xs tracking-[0.2em] uppercase disabled:opacity-50 disabled:scale-100 flex justify-center items-center">
            
            <div v-if="processing" class="w-5 h-5 rounded-full border-2 border-[var(--v-bg-base)] border-opacity-20 border-t-[var(--v-bg-base)] animate-spin"></div>
            <span v-else>{{ authStore.user ? 'Acceptar Invitació' : 'Identifica\'t per Unir-te' }}</span>
         </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useServerStore } from '../stores/domain/serverStore'
import { ENV } from '../utils/env'

const props = defineProps<{
    code: string
}>()

const router = useRouter()
const authStore = useAuthStore()
const serverStore = useServerStore()

const loading = ref(true)
const error = ref('')
const processing = ref(false)
const preview = ref<{ name: string, ownerUsername: string, memberCount: number, expiresAt: string | null } | null>(null)

function formatTimeRemaining(expiresAt: string | null | undefined): string {
  if (!expiresAt) return ''
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return 'Expired'
  const days = Math.floor(ms / 86400000)
  const hours = Math.floor((ms % 86400000) / 3600000)
  if (days > 0) return `Expires in ${days}d ${hours}h`
  const minutes = Math.floor((ms % 3600000) / 60000)
  if (hours > 0) return `Expires in ${hours}h ${minutes}m`
  return `Expires in ${minutes}m`
}

onMounted(async () => {
    try {
        const response = await fetch(`${ENV.API_URL}/servers/invite/${props.code}`)
        if (!response.ok) {
            throw new Error(response.status === 404 ? 'L\'enllaç ha expirat o no existeix.' : 'Error contactant el servidor.')
        }
        preview.value = await response.json()
    } catch (err: any) {
        error.value = err.message
    } finally {
        loading.value = false
    }
})

const returnToApp = () => {
    router.push('/')
}

const handleAccept = async () => {
    if (!authStore.user) {
        localStorage.setItem('vertex_pending_invite', props.code)
        router.push('/')
        return
    }

    try {
        processing.value = true
        await serverStore.joinServer(props.code)
        router.push('/')
    } catch (err: any) {
        error.value = err.message || "No s'ha pogut acceptar."
    } finally {
        processing.value = false
    }
}
</script>
