import { defineStore } from 'pinia';
import { useAuthStore } from '../authStore';

export const useServerStore = defineStore('server', {
    state: () => ({
        servers: [] as any[],
        channels: [] as any[],
    }),

    actions: {
        async fetchServers() {
            const authStore = useAuthStore();
            if (!authStore.user) return;
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/servers/user/${authStore.user.id}`);
                if (res.ok) {
                    this.servers = await res.json();
                }
            } catch (e) {
                console.error('Error fetching servers:', e);
            }
        },

        async fetchChannels(serverId: string) {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/servers/${serverId}/channels`);
                if (res.ok) {
                    this.channels = await res.json();
                }
            } catch (e) {
                console.error('Error fetching channels:', e);
            }
        }
    }
});
