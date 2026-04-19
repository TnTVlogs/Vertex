import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ViewType = 'home' | 'friends' | 'server' | 'settings' | 'admin'

export const useNavigationStore = defineStore('navigation', () => {
    const activeView = ref<ViewType>('home')
    const activeServerId = ref<string | null>(null)
    const activeChannelId = ref<string | null>(null)
    const activeRecipientId = ref<string | null>(null)

    function setActiveView(view: ViewType) {
        activeView.value = view
        if (view !== 'server') {
            activeServerId.value = null
            activeChannelId.value = null
        }
        if (view === 'friends') {
            activeRecipientId.value = null
        }
    }

    function setServer(serverId: string, channelId?: string) {
        activeView.value = 'server'
        activeServerId.value = serverId
        if (channelId) activeChannelId.value = channelId
        activeRecipientId.value = null
    }

    function setDM(recipientId: string) {
        activeView.value = 'home'
        activeRecipientId.value = recipientId
        activeServerId.value = null
        activeChannelId.value = null
    }

    return {
        activeView,
        activeServerId,
        activeChannelId,
        activeRecipientId,
        setActiveView,
        setServer,
        setDM
    }
})
