<template>
  <div class="flex flex-col h-full text-[var(--v-text-primary)] font-sans">
    <MessageList ref="messageListRef" />
    <ChatInput />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useChatStore } from '../stores/chatStore'
import { useAuthStore } from '../stores/authStore'
import MessageList from './MessageList.vue'
import ChatInput from './ChatInput.vue'

const chatStore = useChatStore()
const authStore = useAuthStore()
const messageListRef = ref<InstanceType<typeof MessageList> | null>(null)

watch([() => chatStore.activeChannelId, () => chatStore.activeRecipientId], ([newChan, newRecip]) => {
  if (newChan) {
    chatStore.fetchMessages(newChan, 'channel')
    chatStore.socket?.emit('join-channel', newChan)
  } else if (newRecip) {
    chatStore.fetchMessages(newRecip, 'dm')
  }
  messageListRef.value?.scrollToBottom()
}, { immediate: true })

watch(() => chatStore.sortedMessages, () => {
  messageListRef.value?.scrollToBottom()
}, { deep: true })

onMounted(() => {
  if (authStore.user) {
    chatStore.connect()
  }
  messageListRef.value?.scrollToBottom()
})
</script>
