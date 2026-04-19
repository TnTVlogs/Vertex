<template>
  <div class="flex flex-col h-full text-[var(--v-text-primary)] font-sans">
    <MessageList ref="messageListRef" />
    <div v-if="typingLabel" class="px-8 pb-1 text-[10px] text-[var(--v-text-secondary)] italic h-4 shrink-0">
      {{ typingLabel }}
    </div>
    <ChatInput />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useChatStore } from '../stores/chatStore'
import { useAuthStore } from '../stores/authStore'
import { useSocketStore } from '../stores/domain/socketStore'
import { useMessageStore } from '../stores/domain/messageStore'
import { useFriendStore } from '../stores/domain/friendStore'
import MessageList from './MessageList.vue'
import ChatInput from './ChatInput.vue'

const socketStore = useSocketStore()
const messageStore = useMessageStore()
const friendStore = useFriendStore()

const chatStore = useChatStore()
const authStore = useAuthStore()
const messageListRef = ref<InstanceType<typeof MessageList> | null>(null)

function resolveUsername(userId: string): string {
  const fromMsg = messageStore.messages.find(m => m.authorId === userId)
  if (fromMsg?.author?.username) return fromMsg.author.username
  const fromFriend = friendStore.friends.find((f: any) => f.id === userId)
  if (fromFriend?.username) return fromFriend.username
  return userId.slice(0, 8)
}

const typingLabel = computed(() => {
  const activeChannel = chatStore.activeChannelId
  const activeRecipient = chatStore.activeRecipientId
  const myId = authStore.user?.id
  const users = Object.entries(socketStore.typingUsers)
    .filter(([uid, t]) => uid !== myId && (t.channelId === activeChannel || t.recipientId === activeRecipient))
    .map(([uid]) => resolveUsername(uid))
  if (users.length === 0) return ''
  if (users.length === 1) return `${users[0]} is typing...`
  return 'Several people are typing...'
})

watch([() => chatStore.activeChannelId, () => chatStore.activeRecipientId], ([newChan, newRecip]) => {
  if (newChan) {
    chatStore.fetchMessages(newChan, 'channel')
    socketStore.joinChannel(newChan)
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
