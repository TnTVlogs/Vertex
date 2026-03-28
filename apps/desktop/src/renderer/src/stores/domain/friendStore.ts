import { defineStore } from 'pinia';
import { useAuthStore } from '../authStore';
import { User } from '@shared/models';
import { apiFetch } from '../../utils/api';

export const useFriendStore = defineStore('friend', {
    state: () => ({
        friends: [] as User[],
        friendRequests: [] as any[],
    }),

    actions: {
        async fetchFriends() {
            const authStore = useAuthStore();
            if (!authStore.user) return;
            try {
                // We use standard fetch here to match existing behavior without rewriting everything to apiFetch yet,
                // but the apiFetch could be easily swapped.
                const res = await fetch(`${import.meta.env.VITE_API_URL}/social/friends/${authStore.user.id}`);
                if (res.ok) {
                    this.friends = await res.json();
                }
            } catch (e) {
                console.error('Error fetching friends:', e);
            }
        },

        async fetchRequests() {
            const authStore = useAuthStore();
            if (!authStore.user) return;
            try {
                const url = `${import.meta.env.VITE_API_URL}/social/requests/${authStore.user.id}`;
                const res = await fetch(url);
                if (res.ok) {
                    this.friendRequests = await res.json();
                }
            } catch (e) {
                console.error('Error fetching requests:', e);
            }
        },

        async respondToRequest(requestId: string, status: 'accepted' | 'declined') {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/social/request/respond`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requestId, status })
                });
                if (res.ok) {
                    await this.fetchRequests();
                    if (status === 'accepted') await this.fetchFriends();
                }
            } catch (e) {
                console.error('Error responding to request:', e);
            }
        },

        updatePresence(userId: string, status: string) {
            const friend = this.friends.find((f: User) => f.id === userId);
            if (friend) friend.status = status as any;
        },

        addRequest(request: any) {
            this.friendRequests.push(request);
        },

        async handleResponse(data: any) {
            this.friendRequests = this.friendRequests.filter(r => r.id !== data.requestId);
            if (data.status === 'accepted') {
                await this.fetchFriends();
            }
        }
    }
});
