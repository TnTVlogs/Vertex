<template>
  <div class="bg-[var(--v-bg-base)] border-t border-[var(--v-border)] p-6 z-20">
    <div class="max-w-4xl mx-auto relative" ref="inputContainer">
      <!-- Emoji Picker Overlay -->
      <EmojiPicker
        v-if="showEmojiPicker"
        @select="addEmoji"
      />

      <!-- Attachment badge -->
      <div v-if="pendingAttachment" class="mb-2 flex items-center space-x-2 px-3 py-2 bg-[var(--v-bg-surface)] border border-[var(--v-border)] rounded-xl text-xs font-bold text-[var(--v-text-secondary)]">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" class="text-[var(--v-accent)]"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>
        <span class="flex-1 truncate max-w-xs">{{ pendingAttachment.filename }}</span>
        <button @click="pendingAttachment = null" class="hover:text-red-500 transition-colors">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>

      <div class="glass rounded-2xl p-2 shadow-2xl flex items-center">
        <!-- Attachment button -->
        <button
          @click="triggerFileUpload"
          :disabled="isUploading"
          class="w-10 h-10 flex items-center justify-center transition-colors"
          :class="isUploading ? 'text-[var(--v-accent)]' : 'text-[var(--v-text-secondary)] hover:text-[var(--v-text-primary)]'"
          title="Attach file"
        >
          <div v-if="isUploading" class="w-4 h-4 border-2 border-[var(--v-accent)] border-t-transparent rounded-full animate-spin"></div>
          <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>
        </button>
        <input ref="fileInput" type="file" class="hidden" @change="handleFileChange" />
        <textarea
          ref="chatInput"
          v-model="messageText"
          @keydown.enter.exact.prevent="handleSend"
          @input="autoResize(); handleTyping(); expandShortcodes()"
          rows="1"
          :placeholder="i18n.t('chat.placeholder')"
          class="flex-1 bg-transparent border-none outline-none resize-none px-4 py-2 text-sm font-medium text-[var(--v-text-primary)] tracking-wide overflow-y-auto max-h-32 min-h-[1.5em] select-text placeholder:text-[var(--v-text-secondary)] placeholder:opacity-50"
        ></textarea>
        <div class="flex items-center pr-2 space-x-1">
          <span
            v-if="charCount > 0"
            class="text-[10px] font-mono font-bold mr-1 transition-colors"
            :class="isOverLimit ? 'text-red-500' : charCount > tierLimit * 0.85 ? 'text-yellow-500' : 'text-[var(--v-text-secondary)]'"
          >{{ charCount }}/{{ tierLimit }}</span>
          <button
            @click="showEmojiPicker = !showEmojiPicker"
            class="p-2 transition-all"
            :class="showEmojiPicker ? 'text-[var(--v-accent)]' : 'text-[var(--v-text-secondary)] hover:text-[var(--v-accent)]'"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5s.67 1.5 1.5 1.5zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
          </button>
          <button
            @click="handleSend"
            :disabled="isOverLimit || (charCount === 0 && !pendingAttachment) || isSending"
            class="px-4 py-2 rounded-xl vertex-gradient text-[var(--v-bg-base)] text-[10px] font-black shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {{ i18n.t('chat.send') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useChatStore } from '../stores/chatStore'
import { useAuthStore } from '../stores/authStore'
import { useMessageStore } from '../stores/domain/messageStore'
import { useI18nStore } from '../stores/i18nStore'
import { useSocketStore } from '../stores/domain/socketStore'
import EmojiPicker from './EmojiPicker.vue'
import { SHORTCODE_TO_UNICODE } from '../utils/shortcodes'
import { v4 as uuidv4 } from 'uuid'

const chatStore = useChatStore()
const authStore = useAuthStore()
const messageStore = useMessageStore()
const i18n = useI18nStore()
const socketStore = useSocketStore()

const showEmojiPicker = ref(false)
const chatInput = ref<HTMLTextAreaElement | null>(null)
const inputContainer = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const messageText = ref('')
const isSending = ref(false)
const isUploading = ref(false)
const pendingAttachment = ref<{ url: string; filename: string; mimetype: string } | null>(null)
let typingTimeout: ReturnType<typeof setTimeout> | null = null
let isTyping = false

function triggerFileUpload() {
  fileInput.value?.click()
}

async function handleFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  isUploading.value = true
  try {
    const result = await authStore.uploadAttachment(file)
    pendingAttachment.value = result
  } catch (err: any) {
    console.error('Attachment upload failed:', err.message)
  } finally {
    isUploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

function expandShortcodes() {
  const el = chatInput.value
  if (!el) return
  const text = el.value  // read directly from DOM, always current
  const cursor = el.selectionStart ?? text.length
  const before = text.slice(0, cursor)
  const match = before.match(/:([a-z0-9_]+):$/)
  if (!match) return
  const shortcode = match[0]
  const unicode = SHORTCODE_TO_UNICODE[shortcode]
  if (!unicode) return
  const start = cursor - shortcode.length
  const newText = text.slice(0, start) + unicode + text.slice(cursor)
  messageText.value = newText
  nextTick(() => {
    const newPos = start + unicode.length
    el.setSelectionRange(newPos, newPos)
  })
}

const TIER_LIMITS: Record<string, number> = { BASIC: 200, PRO: 400, VIP: 500 }
const tierLimit = computed(() => {
  const tier = (authStore.user as any)?.tier ?? 'BASIC'
  return TIER_LIMITS[tier] ?? 200
})
const charCount = computed(() => messageText.value.length)
const isOverLimit = computed(() => charCount.value > tierLimit.value)

function autoResize() {
  const el = chatInput.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 128) + 'px'
}

function handleTyping() {
  if (!isTyping) {
    isTyping = true
    socketStore.emitTyping(chatStore.activeChannelId, chatStore.activeRecipientId)
  }
  if (typingTimeout) clearTimeout(typingTimeout)
  typingTimeout = setTimeout(() => {
    isTyping = false
    socketStore.emitStopTyping(chatStore.activeChannelId, chatStore.activeRecipientId)
  }, 2000)
}

async function handleSend() {
  if (isOverLimit.value || isSending.value) return
  const text = messageText.value.trim()
  const attachment = pendingAttachment.value
  if ((!text && !attachment) || !authStore.user) return

  isSending.value = true
  if (typingTimeout) clearTimeout(typingTimeout)
  if (isTyping) {
    isTyping = false
    socketStore.emitStopTyping(chatStore.activeChannelId, chatStore.activeRecipientId)
  }
  const tempId = uuidv4()

  messageStore.addOptimisticMessage({
    id: tempId,
    content: text,
    authorId: authStore.user.id,
    channelId: chatStore.activeChannelId ?? undefined,
    recipientId: chatStore.activeRecipientId ?? undefined,
    createdAt: new Date(),
    author: {
      id: authStore.user.id,
      username: authStore.user.username,
      avatarUrl: authStore.user.avatarUrl
    },
    attachmentUrl: attachment?.url,
  })

  messageText.value = ''
  pendingAttachment.value = null
  showEmojiPicker.value = false
  nextTick(autoResize)

  try {
    const response = await chatStore.sendMessage(text, attachment?.url)
    if (response && response.status === 'ok') {
      messageStore.updateMessageStatus(tempId, 'sent', response.messageId)
    } else {
      messageStore.updateMessageStatus(tempId, 'error')
    }
  } catch (e) {
    messageStore.updateMessageStatus(tempId, 'error')
  } finally {
    isSending.value = false
  }
}
function addEmoji(shortcode: string) {
  const el = chatInput.value
  if (!el) return
  const unicode = SHORTCODE_TO_UNICODE[shortcode] ?? shortcode
  const start = el.selectionStart ?? messageText.value.length
  const end = el.selectionEnd ?? messageText.value.length
  messageText.value = messageText.value.slice(0, start) + unicode + messageText.value.slice(end)
  nextTick(() => {
    const newPos = start + unicode.length
    el.setSelectionRange(newPos, newPos)
    el.focus()
    autoResize()
  })
  showEmojiPicker.value = true
}

function handleClickOutside(e: MouseEvent) {
  if (showEmojiPicker.value && inputContainer.value && !inputContainer.value.contains(e.target as Node)) {
    showEmojiPicker.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>
