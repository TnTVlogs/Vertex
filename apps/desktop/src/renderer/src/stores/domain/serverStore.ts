import { defineStore } from 'pinia';
import { useAuthStore } from '../authStore';
import { useNavigationStore } from '../navigationStore';
import { ENV } from '../../utils/env';

export const useServerStore = defineStore('server', {
    state: () => ({
        servers: [] as any[],
        channels: [] as any[],
    }),

    getters: {
        currentServer(state) {
            const navStore = useNavigationStore();
            return state.servers.find(s => s.id === navStore.activeServerId) || null;
        },
        isOwner() {
            const authStore = useAuthStore();
            const server = this.currentServer;
            if (!server || !authStore.user) return false;
            return (server.ownerId === authStore.user.id) || (server.owner_id === authStore.user.id);
        }
    },

    actions: {
        async fetchServers() {
            const authStore = useAuthStore();
            if (!authStore.user) return;
            try {
                const res = await fetch(`${ENV.API_URL}/servers/user/${authStore.user.id}`, {
                    headers: { Authorization: `Bearer ${authStore.token}` }
                });
                if (res.ok) {
                    this.servers = await res.json();
                }
            } catch (e) {
                console.error('Error fetching servers:', e);
            }
        },

        async fetchChannels(serverId: string) {
            const authStore = useAuthStore();
            try {
                const res = await fetch(`${ENV.API_URL}/servers/${serverId}/channels`, {
                    headers: { Authorization: `Bearer ${authStore.token}` }
                });
                if (res.ok) {
                    this.channels = await res.json();
                }
            } catch (e) {
                console.error('Error fetching channels:', e);
            }
        },

        // --- Management Actions ---
        async createChannel(serverId: string, name: string, type: 'text' | 'voice') {
            const authStore = useAuthStore();
            const res = await fetch(`${ENV.API_URL}/servers/${serverId}/channels`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authStore.token}`
                },
                body: JSON.stringify({ name, type })
            });
            if (res.ok) await this.fetchChannels(serverId);
            return res.ok;
        },

        async updateChannel(serverId: string, channelId: string, name: string) {
            const authStore = useAuthStore();
            const res = await fetch(`${ENV.API_URL}/servers/${serverId}/channels/${channelId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authStore.token}`
                },
                body: JSON.stringify({ name })
            });
            if (res.ok) await this.fetchChannels(serverId);
            return res.ok;
        },

        async deleteChannel(serverId: string, channelId: string) {
            const authStore = useAuthStore();
            const res = await fetch(`${ENV.API_URL}/servers/${serverId}/channels/${channelId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${authStore.token}` }
            });
            if (res.ok) await this.fetchChannels(serverId);
            return res.ok;
        },

        async generateInvite(serverId: string) {
            const authStore = useAuthStore();
            const res = await fetch(`${ENV.API_URL}/servers/${serverId}/invite`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${authStore.token}` }
            });
            if (res.ok) await this.fetchServers(); // Refresh server data for inviteCode
            return res.ok;
        },

        async revokeInvite(serverId: string) {
            const authStore = useAuthStore();
            const res = await fetch(`${ENV.API_URL}/servers/${serverId}/invite`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${authStore.token}` }
            });
            if (res.ok) await this.fetchServers();
            return res.ok;
        },

        async kickMember(serverId: string, userId: string) {
            const authStore = useAuthStore();
            const res = await fetch(`${ENV.API_URL}/servers/${serverId}/members/${userId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${authStore.token}` }
            });
            return res.ok;
        },

        async transferOwnership(serverId: string, newOwnerId: string) {
            const authStore = useAuthStore();
            const res = await fetch(`${ENV.API_URL}/servers/${serverId}/transfer`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authStore.token}`
                },
                body: JSON.stringify({ newOwnerId })
            });
            if (res.ok) await this.fetchServers();
            return res.ok;
        },

        async deleteServer(serverId: string) {
            const authStore = useAuthStore();
            const res = await fetch(`${ENV.API_URL}/servers/${serverId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${authStore.token}` }
            });
            if (res.ok) {
                this.servers = this.servers.filter(s => s.id !== serverId);
            }
            return res.ok;
        },

        async joinServer(inviteCode: string) {
            const authStore = useAuthStore();
            if (!authStore.user) return false;
            
            const res = await fetch(`${ENV.API_URL}/servers/join`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authStore.token}`
                },
                body: JSON.stringify({ inviteCode, userId: authStore.user.id })
            });

            if (res.ok) {
                await this.fetchServers();
                return true;
            } else {
                const data = await res.json();
                throw new Error(data.error || 'Failed to join server');
            }
        }
    }
});
