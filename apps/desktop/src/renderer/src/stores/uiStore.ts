import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
    // Controls the left sidebar (server icons + channel list) visibility on mobile
    const isLeftSidebarOpen = ref(false)
    // Reserved for a future right-side members panel
    const isRightSidebarOpen = ref(false)

    function toggleLeftSidebar() {
        isLeftSidebarOpen.value = !isLeftSidebarOpen.value
        if (isRightSidebarOpen.value) isRightSidebarOpen.value = false
    }

    function toggleRightSidebar() {
        isRightSidebarOpen.value = !isRightSidebarOpen.value
        if (isLeftSidebarOpen.value) isLeftSidebarOpen.value = false
    }

    // Call when navigating to a channel/DM so the overlay closes automatically on mobile
    function closeAll() {
        isLeftSidebarOpen.value = false
        isRightSidebarOpen.value = false
    }

    return {
        isLeftSidebarOpen,
        isRightSidebarOpen,
        toggleLeftSidebar,
        toggleRightSidebar,
        closeAll
    }
})
