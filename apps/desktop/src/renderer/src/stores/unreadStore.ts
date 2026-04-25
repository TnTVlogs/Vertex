import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useFriendStore } from './domain/friendStore'

export const useUnreadStore = defineStore('unread', () => {
    const dmCounts = ref<Record<string, number>>({})

    function incrementDM(userId: string) {
        dmCounts.value[userId] = (dmCounts.value[userId] ?? 0) + 1
    }

    function clearDM(userId: string) {
        dmCounts.value[userId] = 0
    }

    function getDMCount(userId: string): number {
        return dmCounts.value[userId] ?? 0
    }

    const pendingRequestCount = computed(() => {
        const friendStore = useFriendStore()
        return friendStore.friendRequests.filter(r => r.direction === 'incoming').length
    })

    return { dmCounts, incrementDM, clearDM, getDMCount, pendingRequestCount }
})
