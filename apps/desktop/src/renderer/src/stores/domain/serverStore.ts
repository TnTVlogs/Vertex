import { defineStore } from 'pinia';
import { useAuthStore } from '../authStore';
import { useNavigationStore } from '../navigationStore';
import { useToastStore } from '../toastStore';
import { Server, Channel, ServerMember } from '@shared/models';
import { ENV } from '../../utils/env';

export const useServerStore = defineStore('server', {
    state: () => ({
        servers: [] as Server[],
        channels: [] as Channel[],
        members: [] as ServerMember[],
    }),

    getters: {
        currentServer(state) {
            const navStore = useNavigationStore();
            return state.servers.find(s => s.id === navStore.activeServerId) || null;
        },
        isOwner(): boolean {
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

        async fetchMembers(serverId: string) {
            const authStore = useAuthStore();
            try {
                const res = await fetch(`${ENV.API_URL}/servers/${serverId}/members`, {
                    headers: { Authorization: `Bearer ${authStore.token}` }
                });
                if (res.ok) {
                    this.members = await res.json();
                }
            } catch (e) {
                console.error('Error fetching members:', e);
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

        async generateInvite(serverId: string, expiresInDays: number | null = 7) {
            const authStore = useAuthStore();
            const res = await fetch(`${ENV.API_URL}/servers/${serverId}/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authStore.token}`
                },
                body: JSON.stringify({ expiresInDays })
            });
            if (res.ok) {
                const data = await res.json();
                // Patch the server in-place so the UI updates immediately without a full re-fetch
                const server = this.servers.find(s => s.id === serverId);
                if (server) {
                    server.inviteCode = data.inviteCode;
                    server.inviteExpiresAt = data.inviteExpiresAt;
                }
            }
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
            if (res.ok) await this.fetchMembers(serverId);
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

        clearChannels() {
            this.channels = [];
        },

        async deleteServer(serverId: string) {
            const authStore = useAuthStore();
            const res = await fetch(`${ENV.API_URL}/servers/${serverId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${authStore.token}` }
            });
            if (res.ok) {
                this.servers = this.servers.filter(s => s.id !== serverId);
                this.channels = [];
                this.members = [];
            }
            return res.ok;
        },

        async joinServer(inviteInput: string) {
            const authStore = useAuthStore();
            const toastStore = useToastStore();

            if (!authStore.user) return false;
            
            // Link Normalization: Extract the pure code whether it's a URL or just a code
            let inviteCode = inviteInput.trim();
            const match = inviteCode.match(/\/invite\/([a-zA-Z0-9]+)$/);
            if (match) {
                inviteCode = match[1];
            } else if (inviteCode.includes('/')) {
                // Failsafe: if it's a messy URL, grab the last part
                inviteCode = inviteCode.split('/').pop() || inviteCode;
            }

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
                toastStore.addToast(`Successfully connected via code [${inviteCode}]`, 'success');
                return true;
            } else {
                const data = await res.json();
                toastStore.addToast(data.error || 'Failed to join server', 'error');
                throw new Error(data.error || 'Failed to join server');
            }
        }
    }
});
