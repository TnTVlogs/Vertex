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
          class="w-10 h-10 flex items-center justify-center transition-colors shrink-0"
          :class="isUploading ? 'text-[var(--v-accent)]' : 'text-[var(--v-text-secondary)] hover:text-[var(--v-text-primary)]'"
          title="Attach file"
        >
          <div v-if="isUploading" class="w-4 h-4 border-2 border-[var(--v-accent)] border-t-transparent rounded-full animate-spin"></div>
          <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>
        </button>
        <input ref="fileInput" type="file" class="hidden" @change="handleFileChange" />

        <div
          ref="chatInput"
          contenteditable="true"
          :data-placeholder="i18n.t('chat.placeholder')"
          @input="handleContentInput"
          @keydown.enter.exact.prevent="handleSend"
          @copy.prevent="handleCopy"
          @paste.prevent="handlePaste"
          class="chat-input flex-1 px-4 py-2 text-sm font-medium text-[var(--v-text-primary)] tracking-wide overflow-y-auto max-h-32 min-h-[1.5em] outline-none select-text"
        ></div>

        <div class="flex items-center pr-2 space-x-1 shrink-0">
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useChatStore } from '../stores/chatStore'
import { useAuthStore } from '../stores/authStore'
import { useMessageStore } from '../stores/domain/messageStore'
import { useI18nStore } from '../stores/i18nStore'
import { useSocketStore } from '../stores/domain/socketStore'
import EmojiPicker from './EmojiPicker.vue'
import { getEmojiUrl } from '../utils/emoji'
import { v4 as uuidv4 } from 'uuid'

const chatStore = useChatStore()
const authStore = useAuthStore()
const messageStore = useMessageStore()
const i18n = useI18nStore()
const socketStore = useSocketStore()

const showEmojiPicker = ref(false)
const chatInput = ref<HTMLElement | null>(null)
const inputContainer = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const messageText = ref('')
const isSending = ref(false)
const isUploading = ref(false)
const pendingAttachment = ref<{ url: string; filename: string; mimetype: string } | null>(null)
let typingTimeout: ReturnType<typeof setTimeout> | null = null
let isTyping = false

// ── Emoji img helpers ──────────────────────────────────────────────────────

function createEmojiImg(shortcode: string): HTMLImageElement | null {
  const url = getEmojiUrl(shortcode)
  if (!url) return null
  const img = document.createElement('img')
  img.src = url
  img.alt = shortcode
  img.className = 'twemoji-input'
  img.setAttribute('draggable', 'false')
  return img
}

// ── Text extraction (innerHTML → shortcodes) ───────────────────────────────

function extractText(el: Node): string {
  let text = ''
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? ''
    } else if ((node as Element).tagName === 'IMG') {
      text += (node as HTMLImageElement).alt ?? ''
    } else if ((node as Element).tagName === 'BR') {
      text += '\n'
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as Element).tagName
      if (tag === 'DIV' || tag === 'P') text += '\n'
      text += extractText(node)
    }
  }
  return text
}

function updateMessageText() {
  const el = chatInput.value
  messageText.value = el ? extractText(el) : ''
}

// ── Shortcode expansion ────────────────────────────────────────────────────

function expandShortcodeAtCursor() {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return
  const range = sel.getRangeAt(0)
  if (!range.collapsed) return

  const node = range.startContainer
  if (node.nodeType !== Node.TEXT_NODE) return

  const text = node.textContent ?? ''
  const cursor = range.startOffset
  const before = text.slice(0, cursor)
  const match = before.match(/:([a-z0-9_]+):$/)
  if (!match) return

  const shortcode = match[0]
  const img = createEmojiImg(shortcode)
  if (!img) return

  const start = cursor - shortcode.length
  const textNode = node as Text
  const parent = textNode.parentNode!

  const beforeNode = document.createTextNode(text.slice(0, start))
  const afterNode = document.createTextNode(text.slice(cursor))
  parent.insertBefore(beforeNode, textNode)
  parent.insertBefore(img, textNode)
  parent.insertBefore(afterNode, textNode)
  parent.removeChild(textNode)

  const newRange = document.createRange()
  newRange.setStartAfter(img)
  newRange.collapse(true)
  sel.removeAllRanges()
  sel.addRange(newRange)
}

function expandAllShortcodes(el: HTMLElement) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  let n: Text | null
  while ((n = walker.nextNode() as Text | null)) textNodes.push(n)

  for (const textNode of textNodes) {
    const text = textNode.textContent ?? ''
    if (!/:([a-z0-9_]+):/.test(text)) continue

    const parts = text.split(/(:[a-z0-9_]+:)/g)
    if (parts.length <= 1) continue

    const frag = document.createDocumentFragment()
    for (const part of parts) {
      const img = /^:[a-z0-9_]+:$/.test(part) ? createEmojiImg(part) : null
      frag.appendChild(img ?? document.createTextNode(part))
    }
    textNode.parentNode?.replaceChild(frag, textNode)
  }
}

// ── Input handler ──────────────────────────────────────────────────────────

function handleContentInput() {
  expandShortcodeAtCursor()
  updateMessageText()
  handleTyping()
}

// ── Copy: serialize selection as shortcode text ───────────────────────────

function handleCopy(e: ClipboardEvent) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || !e.clipboardData) return
  const frag = sel.getRangeAt(0).cloneContents()
  const tmp = document.createElement('div')
  tmp.appendChild(frag)
  e.clipboardData.setData('text/plain', extractText(tmp))
}

// ── Paste: insert plain text, expand shortcodes ───────────────────────────

function handlePaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text/plain') ?? ''
  if (!text) return

  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return
  const range = sel.getRangeAt(0)
  range.deleteContents()
  const textNode = document.createTextNode(text)
  range.insertNode(textNode)
  range.setStartAfter(textNode)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)

  const el = chatInput.value
  if (el) expandAllShortcodes(el)
  updateMessageText()
}

// ── Emoji picker insert ────────────────────────────────────────────────────

function addEmoji(shortcode: string) {
  const el = chatInput.value
  if (!el) return
  el.focus()

  const img = createEmojiImg(shortcode)
  if (!img) return

  const sel = window.getSelection()
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0)
    range.deleteContents()
    range.insertNode(img)
    range.setStartAfter(img)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
  } else {
    el.appendChild(img)
  }

  updateMessageText()
  showEmojiPicker.value = true
}

// ── Tier / char count ─────────────────────────────────────────────────────

const TIER_LIMITS: Record<string, number> = { BASIC: 200, PRO: 400, VIP: 500 }
const tierLimit = computed(() => {
  const tier = (authStore.user as any)?.tier ?? 'BASIC'
  return TIER_LIMITS[tier] ?? 200
})
const charCount = computed(() => messageText.value.length)
const isOverLimit = computed(() => charCount.value > tierLimit.value)

// ── Typing indicator ──────────────────────────────────────────────────────

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

// ── Send ──────────────────────────────────────────────────────────────────

async function handleSend() {
  if (isOverLimit.value || isSending.value) return
  const el = chatInput.value
  const text = (el ? extractText(el) : messageText.value).trim()
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

  if (el) el.innerHTML = ''
  messageText.value = ''
  pendingAttachment.value = null
  showEmojiPicker.value = false

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

// ── File upload ───────────────────────────────────────────────────────────

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

// ── Click outside ─────────────────────────────────────────────────────────

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

<style scoped>
.chat-input:empty::before {
  content: attr(data-placeholder);
  color: var(--v-text-secondary);
  opacity: 0.5;
  pointer-events: none;
}

:deep(.twemoji-input) {
  width: 1.2em;
  height: 1.2em;
  vertical-align: -0.2em;
  display: inline;
}
</style>
