<template>
  <div class="flex-1 overflow-hidden flex flex-col">
    <!-- Load older messages -->
    <div class="flex justify-center py-2 shrink-0">
      <button
        v-if="messageStore.hasMore && !messageStore.isLoading"
        @click="handleLoadOlder"
        :disabled="messageStore.isLoadingOlder"
        class="text-[10px] font-black uppercase tracking-widest text-[var(--v-text-secondary)] hover:text-[var(--v-accent)] transition-colors disabled:opacity-40"
      >
        {{ messageStore.isLoadingOlder ? '...' : '↑ Load older messages' }}
      </button>
    </div>

    <!-- Skeletons while loading -->
    <div v-if="messageStore.isLoading" class="flex-1 overflow-y-auto px-8 py-6 space-y-6 no-scrollbar">
      <div v-for="i in 6" :key="i"
           class="flex items-end space-x-3 opacity-20 animate-pulse"
           :class="i % 3 === 0 ? 'flex-row-reverse space-x-reverse' : 'flex-row'"
      >
        <div class="w-9 h-9 rounded-xl bg-white/20 shrink-0"></div>
        <div class="flex flex-col space-y-2 w-1/2" :class="i % 3 === 0 ? 'items-end' : 'items-start'">
          <div class="h-2 w-20 bg-white/20 rounded"></div>
          <div class="h-10 w-full bg-white/20 rounded-2xl" :class="i % 3 === 0 ? 'rounded-br-sm' : 'rounded-bl-sm'"></div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="sortedMessages.length === 0" class="flex-1 flex flex-col items-center justify-center opacity-20">
      <p class="text-xs font-black tracking-[0.3em] italic uppercase">{{ i18n.t('chat.no_logs') }}</p>
    </div>

    <!-- Virtual message list -->
    <VList
      v-else
      ref="vListRef"
      class="flex-1 px-8 py-6 no-scrollbar"
      :data="sortedMessages"
      :bufferSize="4"
    >
      <template #default="{ item: msg, index }">
        <div
          class="flex group animate-in fade-in slide-in-from-bottom-2 duration-500"
          :class="[
            msg.authorId === authStore.user?.id ? 'flex-row-reverse space-x-reverse' : 'flex-row',
            'items-end space-x-3',
            shouldShowAuthor(msg, index) ? 'mt-6' : 'mt-1'
          ]"
        >
          <!-- Avatar Area (only shown if new group) -->
          <div class="w-9 h-9 shrink-0">
            <UserAvatar
              v-if="shouldShowAuthor(msg, index)"
              :username="msg.author?.username"
              :avatarUrl="msg.author?.avatarUrl"
              size="sm"
              variant="surface"
              :online="msg.authorId !== authStore.user?.id ? true : undefined"
            />
          </div>

          <!-- Content -->
          <div class="flex flex-col max-w-[70%]" :class="msg.authorId === authStore.user?.id ? 'items-end' : 'items-start'">
            <div v-if="shouldShowAuthor(msg, index)" class="flex items-center mb-1 space-x-2 px-1">
              <span class="text-[9px] font-black uppercase tracking-widest text-[var(--v-text-secondary)]">
                {{ msg.author?.username || 'ANONYMOUS' }}
              </span>
              <span class="text-[8px] font-mono text-[var(--v-text-secondary)] opacity-40">
                {{ formatTime(msg.createdAt) }}
              </span>
            </div>
            <div
              class="px-3 py-1.5 rounded-2xl leading-relaxed shadow-sm border transition-all select-text relative group/msg"
              :style="{ fontSize: `${settingsStore.chatFontSize}px` }"
              :class="[
                msg.authorId === authStore.user?.id
                  ? (msg.status === 'error' ? 'bg-red-900/50 border-red-500 text-red-100' : 'bg-[var(--v-accent)] text-white border-transparent shadow-[0_4px_15px_var(--v-accent-glow)]')
                  : 'bg-[var(--v-bg-surface)] border-[var(--v-border)] text-[var(--v-text-primary)] hover:border-[var(--v-accent)]',
                shouldShowAuthor(msg, index)
                  ? (msg.authorId === authStore.user?.id ? 'rounded-br-sm' : 'rounded-bl-sm')
                  : 'rounded-xl',
                msg.status === 'sending' ? 'opacity-50 cursor-wait' : ''
              ]"
            >
              <div v-html="formatMessage(msg.content || '')"></div>

              <!-- Attachment: image -->
              <div v-if="msg.attachmentUrl && attachmentType(msg.attachmentUrl) === 'image'" class="mt-2">
                <img
                  :src="msg.attachmentUrl"
                  @click="lightboxUrl = msg.attachmentUrl"
                  class="rounded-xl max-w-[260px] max-h-48 object-cover cursor-zoom-in hover:opacity-90 transition-opacity block"
                  loading="lazy"
                />
              </div>

              <!-- Attachment: video (custom player, auto-detects audio-only MP4) -->
              <div v-else-if="msg.attachmentUrl && attachmentType(msg.attachmentUrl) === 'video'" class="mt-2">
                <VideoPlayer :src="msg.attachmentUrl" />
              </div>

              <!-- Attachment: audio -->
              <div v-else-if="msg.attachmentUrl && attachmentType(msg.attachmentUrl) === 'audio'" class="mt-2">
                <AudioPlayer :src="msg.attachmentUrl" />
              </div>

              <!-- Attachment: file -->
              <a
                v-else-if="msg.attachmentUrl"
                :href="msg.attachmentUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center space-x-2 mt-2 px-3 py-2 rounded-xl bg-black/20 hover:bg-black/30 transition-colors max-w-xs group/att"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" class="shrink-0 opacity-70"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>
                <span class="text-[11px] font-bold truncate opacity-80 group-hover/att:opacity-100">{{ attachmentName(msg.attachmentUrl) }}</span>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" class="shrink-0 opacity-50 group-hover/att:opacity-100"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
              </a>

              <!-- Status Indicators -->
              <div v-if="msg.authorId === authStore.user?.id" class="absolute -left-6 bottom-1 flex items-center space-x-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                <span v-if="msg.status === 'error'" @click="handleRetry(msg)" class="text-red-500 cursor-pointer hover:scale-110 transition-transform" title="Retry transmission">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-5.5-2.69-5.5-5.5s2.19-5.5 5.5-5.5c1.66 0 3.14.69 4.22 1.78L13 11h7V5l-2.35 1.35z"/></svg>
                </span>
                <span v-if="msg.status === 'sending'" class="text-[var(--v-accent)] animate-spin">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.41 3.59-8 8-8zm5.75 3.25l1.45-1.45C17.72 4.32 15.01 3 12 3v2c2.25 0 4.31.91 5.75 2.25z"/></svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </VList>

    <!-- Image lightbox -->
    <Teleport to="body">
      <div
        v-if="lightboxUrl"
        ref="lightboxEl"
        tabindex="-1"
        @click.self="lightboxUrl = null"
        @keyup.esc="lightboxUrl = null"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm outline-none"
      >
        <div class="relative max-w-[80vw] max-h-[80vh] flex items-center justify-center">
          <img
            :src="lightboxUrl"
            class="max-w-[80vw] max-h-[80vh] rounded-2xl shadow-2xl object-contain"
          />
          <div class="absolute top-3 right-3 flex space-x-2">
            <a
              :href="lightboxUrl"
              :download="true"
              @click.stop
              class="p-2 rounded-xl bg-black/60 hover:bg-black/90 text-white transition-colors"
              title="Download"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            </a>
            <button
              @click="lightboxUrl = null"
              class="p-2 rounded-xl bg-black/60 hover:bg-black/90 text-white transition-colors"
              title="Close"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, computed, watch } from 'vue'
import { VList } from 'virtua/vue'
import UserAvatar from './UserAvatar.vue'
import AudioPlayer from './AudioPlayer.vue'
import VideoPlayer from './VideoPlayer.vue'
import { useChatStore } from '../stores/chatStore'
import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useI18nStore } from '../stores/i18nStore'
import { useMessageStore } from '../stores/domain/messageStore'
import { parseEmojis } from '../utils/emoji'
import DOMPurify from 'dompurify'
import type { Message } from '@shared/models'

const chatStore = useChatStore()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const i18n = useI18nStore()
const messageStore = useMessageStore()

const vListRef = ref<InstanceType<typeof VList> | null>(null)
const sortedMessages = computed((): Message[] => chatStore.sortedMessages)
const lightboxUrl = ref<string | null>(null)
const lightboxEl = ref<HTMLElement | null>(null)

watch(lightboxUrl, (val) => {
  if (val) nextTick(() => lightboxEl.value?.focus())
})

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp'])
const VIDEO_EXTS = new Set(['mp4', 'webm'])
const AUDIO_EXTS = new Set(['mp3', 'mpeg'])

function attachmentExt(url: string) {
  return url.split('?')[0].split('.').pop()?.toLowerCase() ?? ''
}

function attachmentType(url: string): 'image' | 'video' | 'audio' | 'file' {
  const ext = attachmentExt(url)
  if (IMAGE_EXTS.has(ext)) return 'image'
  if (VIDEO_EXTS.has(ext)) return 'video'
  if (AUDIO_EXTS.has(ext)) return 'audio'
  return 'file'
}

function attachmentName(url: string): string {
  const ext = attachmentExt(url)
  const typeMap: Record<string, string> = {
    pdf: 'PDF Document', txt: 'Text File',
    mp4: 'Video', webm: 'Video',
    jpg: 'Image', jpeg: 'Image', png: 'Image', gif: 'Image', webp: 'Image',
  }
  return typeMap[ext] ? `${typeMap[ext]} (.${ext})` : `Attachment (.${ext || '?'})`
}

function formatMessage(text: string) {
  if (!text) return ''
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
  const withEmojis = parseEmojis(escaped)
  return DOMPurify.sanitize(withEmojis, {
    ALLOWED_TAGS: ['img', 'br'],
    ALLOWED_ATTR: ['src', 'alt', 'class', 'loading'],
  })
}

function scrollToBottom() {
  nextTick(() => {
    const msgs = sortedMessages.value
    if (vListRef.value && msgs.length > 0) {
      vListRef.value.scrollToIndex(msgs.length - 1, { align: 'end' })
    }
  })
}

async function handleLoadOlder() {
  const prevCount = sortedMessages.value.length
  await messageStore.loadOlderMessages()
  nextTick(() => {
    const newCount = sortedMessages.value.length
    const addedCount = newCount - prevCount
    if (vListRef.value && addedCount > 0) {
      vListRef.value.scrollToIndex(addedCount, { align: 'start' })
    }
  })
}

async function handleRetry(msg: Message) {
  const tempId = msg.id
  messageStore.updateMessageStatus(tempId, 'sending')
  try {
    const response = await chatStore.sendMessage(msg.content)
    if (response && response.status === 'ok') {
      messageStore.updateMessageStatus(tempId, 'sent', response.messageId)
    } else {
      messageStore.updateMessageStatus(tempId, 'error')
    }
  } catch (e) {
    messageStore.updateMessageStatus(tempId, 'error')
  }
}

function shouldShowAuthor(msg: Message, index: number) {
  if (index === 0) return true
  const prevMsg = sortedMessages.value[index - 1]
  const isSameAuthor = prevMsg.authorId === msg.authorId
  const diffMinutes = (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) / 60000
  return !isSameAuthor || diffMinutes > 1
}

function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

defineExpose({ scrollToBottom })
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

@keyframes pulse {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.1; }
}
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
