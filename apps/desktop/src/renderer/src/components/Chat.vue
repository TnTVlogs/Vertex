<template>
  <div class="flex flex-col h-full text-[var(--v-text-primary)] font-sans">
    <!-- Message List -->
    <div ref="messageContainer" class="flex-1 overflow-y-auto px-8 py-6 space-y-1 no-scrollbar pb-6">
      <div 
        v-for="(msg, index) in chatStore.sortedMessages" 
        :key="msg.id" 
        class="flex group animate-in fade-in slide-in-from-bottom-2 duration-500"
        :class="[
          msg.authorId === authStore.user?.id ? 'flex-row-reverse space-x-reverse' : 'flex-row',
          'items-end space-x-3',
          shouldShowAuthor(msg, index) ? 'mt-6' : 'mt-1'
        ]"
      >
        <!-- Avatar Area (only shown if new group) -->
        <div class="w-9 h-9 shrink-0">
          <div v-if="shouldShowAuthor(msg, index)" class="relative">
            <div class="w-9 h-9 rounded-xl bg-[var(--v-bg-surface)] border border-[var(--v-border)] flex items-center justify-center text-xs font-black shadow-lg overflow-hidden group-hover:border-[var(--v-accent)] transition-all">
              {{ msg.author?.username?.charAt(0).toUpperCase() || '?' }}
            </div>
            <div v-if="msg.authorId !== authStore.user?.id" class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--v-bg-surface)] bg-[var(--v-accent)]"></div>
          </div>
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
            class="px-3 py-1.5 rounded-2xl leading-relaxed shadow-sm border transition-all select-text"
            :style="{ fontSize: `${settingsStore.chatFontSize}px` }"
            :class="[
              msg.authorId === authStore.user?.id 
                ? 'bg-[var(--v-accent)] text-white font-medium border-transparent shadow-[0_4px_15px_var(--v-accent-glow)]' 
                : 'bg-[var(--v-bg-surface)] border-[var(--v-border)] text-[var(--v-text-primary)] hover:border-[var(--v-accent)]',
              shouldShowAuthor(msg, index) 
                ? (msg.authorId === authStore.user?.id ? 'rounded-br-sm' : 'rounded-bl-sm')
                : 'rounded-xl'
            ]"
            v-html="formatMessage(msg.content)"
          >
          </div>
        </div>
      </div>
      
      <div v-if="chatStore.sortedMessages.length === 0" class="flex-1 flex flex-col items-center justify-center pt-20 opacity-20">
         <p class="text-xs font-black tracking-[0.3em] italic uppercase">{{ i18n.t('chat.no_logs') }}</p>
      </div>
    </div>

    <!-- Fixed Input Area -->
    <div class="bg-[var(--v-bg-base)] border-t border-[var(--v-border)] p-6 z-20">
       <div class="max-w-4xl mx-auto relative" ref="inputContainer">
         <!-- Emoji Picker Overlay (Componentized) -->
         <EmojiPicker 
           v-if="showEmojiPicker" 
           @select="addEmoji"
         />

         <div class="glass rounded-2xl p-2 shadow-2xl flex items-center">
           <button class="w-10 h-10 flex items-center justify-center text-[var(--v-text-secondary)] hover:text-[var(--v-text-primary)] transition-colors">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
           </button>
           <div 
             ref="chatInput"
             contenteditable="true"
             @keydown.enter.prevent="handleSend"
             @input="handleInput"
             @paste="handlePaste"
             class="flex-1 bg-transparent border-none outline-none px-4 py-2 text-sm font-medium text-[var(--v-text-primary)] tracking-wide overflow-y-auto max-h-32 min-h-[1.5em]"
             :data-placeholder="i18n.t('chat.placeholder')"
           ></div>
           <div class="flex items-center pr-2 space-x-1">
              <button 
                @click="showEmojiPicker = !showEmojiPicker"
                class="p-2 transition-all"
                :class="showEmojiPicker ? 'text-[var(--v-accent)]' : 'text-[var(--v-text-secondary)] hover:text-[var(--v-accent)]'"
              >
                 <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5s.67 1.5 1.5 1.5zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
              </button>
              <button @click="handleSend" class="px-4 py-2 rounded-xl vertex-gradient text-[var(--v-bg-base)] text-[10px] font-black shadow-lg hover:scale-105 active:scale-95 transition-all">
                {{ i18n.t('chat.send') }}
              </button>
           </div>
         </div>
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useChatStore } from '../stores/chatStore'
import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useI18nStore } from '../stores/i18nStore'
import EmojiPicker from './EmojiPicker.vue'
import { parseEmojis, getEmojiUrl } from '../utils/emoji'

const chatStore = useChatStore()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const i18n = useI18nStore()
const showEmojiPicker = ref(false)
const messageContainer = ref<HTMLElement | null>(null)
const chatInput = ref<HTMLElement | null>(null)
const inputContainer = ref<HTMLElement | null>(null)

function formatMessage(text: string) {
  if (!text) return ''
  // Basic HTML escaping
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
  
  return parseEmojis(escaped)
}

function scrollToBottom() {
  nextTick(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    }
  })
}

function handleInput(e: Event) {
  const target = e.target as HTMLElement
  const text = target.innerText
  
  // We want to transform shortcodes followed by space regardless of position.
  // We check for the pattern anywhere in the text.
  // Note: We use a global match to find all such patterns.
  const regex = /:([a-z0-9_]+):(\s|\u00A0)/g
  let match;
  let hasTransformed = false;
  let html = target.innerHTML

  // We look for patterns in the HTML to replace.
  // This is safer than replacing the whole innerHTML based on innerText matches.
  while ((match = regex.exec(text)) !== null) {
    const shortcode = `:${match[1]}:`
    const suffix = match[2]
    const url = getEmojiUrl(shortcode)
    
    if (url) {
      const imgTag = `<img src="${url}" class="twemoji" alt="${shortcode}" />${suffix === '\u00A0' ? '&nbsp;' : ' '}`
      
      // Escape for regex and allow for &nbsp; or space
      const escapedShortcode = shortcode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const pattern = new RegExp(escapedShortcode + '(&nbsp;|\\s)')
      
      const newHtml = html.replace(pattern, imgTag)
      if (newHtml !== html) {
        // Save current selection offset relative to text
        const selection = window.getSelection()
        let offset = 0
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          const preCaretRange = range.cloneRange()
          preCaretRange.selectNodeContents(target)
          preCaretRange.setEnd(range.endContainer, range.endOffset)
          offset = preCaretRange.toString().length
        }

        target.innerHTML = newHtml
        
        // Restore caret
        restoreCaret(target, offset)
        hasTransformed = true
      }
    }
  }
}

function restoreCaret(el: HTMLElement, offset: number) {
  const sel = window.getSelection()
  if (!sel) return
  
  const range = document.createRange()
  let currentOffset = 0
  let found = false

  function traverse(node: Node) {
    if (found) return
    
    if (node.nodeType === Node.TEXT_NODE) {
      const nextOffset = currentOffset + (node.textContent?.length || 0)
      if (offset <= nextOffset) {
        range.setStart(node, offset - currentOffset)
        range.collapse(true)
        found = true
      }
      currentOffset = nextOffset
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        traverse(node.childNodes[i])
      }
    }
  }

  traverse(el)
  
  if (!found) {
    range.selectNodeContents(el)
    range.collapse(false)
  }

  sel.removeAllRanges()
  sel.addRange(range)
}

function handlePaste(e: ClipboardEvent) {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain')
  if (text) {
    // Parse the pasted text for both shortcodes and unicode emojis
    const parsedHtml = parseEmojis(text)
    document.execCommand('insertHTML', false, parsedHtml)
  }
}

function handleSend() {
  if (!chatInput.value) return
  
  // Convert HTML back to text with shortcodes
  // We use the alt attribute of the images
  const temp = document.createElement('div')
  temp.innerHTML = chatInput.value.innerHTML
  
  const imgs = temp.querySelectorAll('img')
  imgs.forEach(img => {
    const alt = img.getAttribute('alt')
    if (alt) img.replaceWith(alt)
  })
  
  const text = temp.innerText.trim()
  
  if (text && authStore.user) {
    chatStore.sendMessage(text)
    chatInput.value.innerHTML = ''
    showEmojiPicker.value = false
    scrollToBottom()
  }
}

function addEmoji(shortcode: string) {
  if (!chatInput.value) return

  const url = getEmojiUrl(shortcode)
  if (!url) return

  const imgTag = `<img src="${url}" class="twemoji" alt="${shortcode}" />`
  
  chatInput.value.focus()
  document.execCommand('insertHTML', false, imgTag)
  showEmojiPicker.value = true // Keep it open as before
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

const shouldShowAuthor = (msg: any, index: number) => {
  if (index === 0) return true
  const prevMsg = chatStore.sortedMessages[index - 1]
  const isSameAuthor = prevMsg.authorId === msg.authorId
  const diffMinutes = (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) / 60000
  return !isSameAuthor || diffMinutes > 1
}

const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Fetch messages whenever the target changes
watch([() => chatStore.activeChannelId, () => chatStore.activeRecipientId], ([newChan, newRecip]) => {
  if (newChan) {
    chatStore.fetchMessages(newChan, 'channel')
    chatStore.socket?.emit('join-channel', newChan)
  } else if (newRecip) {
    chatStore.fetchMessages(newRecip, 'dm')
  }
  scrollToBottom()
}, { immediate: true })

// Auto-scroll on new messages
watch(() => chatStore.sortedMessages, () => {
  scrollToBottom()
}, { deep: true })

onMounted(() => {
  if (authStore.user) {
    chatStore.connect()
  }
  scrollToBottom()
})
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
[contenteditable]:empty::before {
  content: attr(data-placeholder);
  color: var(--v-text-secondary);
  opacity: 0.5;
  pointer-events: none;
}
.emoji-category-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.emoji-category-scroll::-webkit-scrollbar {
  display: none;
}
</style>
