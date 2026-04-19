<template>
  <div class="bg-[var(--v-bg-base)] border-t border-[var(--v-border)] p-6 z-20">
    <div class="max-w-4xl mx-auto relative" ref="inputContainer">
      <!-- Emoji Picker Overlay -->
      <EmojiPicker
        v-if="showEmojiPicker"
        @select="addEmoji"
      />

      <div class="glass rounded-2xl p-2 shadow-2xl flex items-center">
        <button class="w-10 h-10 flex items-center justify-center text-[var(--v-text-secondary)] hover:text-[var(--v-text-primary)] transition-colors">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        </button>
        <textarea
          ref="chatInput"
          v-model="messageText"
          @keydown.enter.exact.prevent="handleSend"
          @input="autoResize"
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
            :disabled="isOverLimit || charCount === 0"
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
import EmojiPicker from './EmojiPicker.vue'
import { v4 as uuidv4 } from 'uuid'

const chatStore = useChatStore()
const authStore = useAuthStore()
const messageStore = useMessageStore()
const i18n = useI18nStore()

const showEmojiPicker = ref(false)
const chatInput = ref<HTMLTextAreaElement | null>(null)
const inputContainer = ref<HTMLElement | null>(null)
const messageText = ref('')

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

async function handleSend() {
  if (isOverLimit.value) return
  const text = messageText.value.trim()
  if (text && authStore.user) {
    const tempId = uuidv4()

    // Add optimistically to UI
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
      }
    })

    messageText.value = ''
    showEmojiPicker.value = false
    nextTick(autoResize)

    try {
      const response = await chatStore.sendMessage(text)
      if (response && response.status === 'ok') {
        messageStore.updateMessageStatus(tempId, 'sent', response.messageId)
      } else {
        messageStore.updateMessageStatus(tempId, 'error')
      }
    } catch (e) {
      messageStore.updateMessageStatus(tempId, 'error')
    }
  }
}
function addEmoji(shortcode: string) {
  const el = chatInput.value
  if (!el) return
  const start = el.selectionStart ?? messageText.value.length
  const end = el.selectionEnd ?? messageText.value.length
  messageText.value = messageText.value.slice(0, start) + shortcode + messageText.value.slice(end)
  nextTick(() => {
    const newPos = start + shortcode.length
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
