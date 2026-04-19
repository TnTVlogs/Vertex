import { defineStore } from 'pinia';
import { useAuthStore } from '../authStore';
import { User } from '@shared/models';
import { FriendRequest, FriendResponse } from './socketStore';
import { apiFetch } from '../../utils/api';
import { ENV } from '../../utils/env';

export const useFriendStore = defineStore('friend', {
    state: () => ({
        friends: [] as User[],
        friendRequests: [] as FriendRequest[],
        loadingRequests: new Set<string>(),
    }),

    actions: {
        async fetchFriends() {
            const authStore = useAuthStore();
            if (!authStore.user) return;
            try {
                const res = await fetch(`${ENV.API_URL}/social/friends/${authStore.user.id}`);
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
                const url = `${ENV.API_URL}/social/requests/${authStore.user.id}`;   
                const res = await fetch(url);
                if (res.ok) {
                    this.friendRequests = await res.json();
                }
            } catch (e) {
                console.error('Error fetching requests:', e);
            }
        },

        async respondToRequest(requestId: string, status: 'accepted' | 'declined') { 
            if (this.loadingRequests.has(requestId)) return;
            this.loadingRequests.add(requestId);
            try {
                const res = await fetch(`${ENV.API_URL}/social/request/respond`, {   
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
            } finally {
                this.loadingRequests.delete(requestId);
            }
        },
        updatePresence(userId: string, status: string) {
            const friend = this.friends.find((f: User) => f.id === userId);
            if (friend) friend.status = status as any;
        },

        addRequest(request: FriendRequest) {
            this.friendRequests.push(request);
        },

        async handleResponse(data: FriendResponse) {
            this.friendRequests = this.friendRequests.filter(r => r.id !== data.requestId);
            if (data.status === 'accepted') {
                await this.fetchFriends();
            }
        }
    }
});
