import { defineStore } from 'pinia';
import { useAuthStore } from '../authStore';
import { User } from '@shared/models';
import { FriendRequest, FriendResponse } from './socketStore';
import { ENV } from '../../utils/env';

function authHeaders(): Record<string, string> {
    const token = useAuthStore().token;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export const useFriendStore = defineStore('friend', {
    state: () => ({
        friends: [] as User[],
        friendRequests: [] as FriendRequest[],
        loadingRequests: new Set<string>(),
        friendsNextCursor: null as string | null,
    }),

    actions: {
        async fetchFriends(limit = 50, cursor?: string) {
            const authStore = useAuthStore();
            if (!authStore.user || !authStore.token) return;
            try {
                const params = new URLSearchParams({ limit: String(limit) });
                if (cursor) params.set('cursor', cursor);
                const res = await fetch(
                    `${ENV.API_URL}/social/friends/${authStore.user.id}?${params}`,
                    { headers: authHeaders() }
                );
                if (res.ok) {
                    const data = await res.json();
                    if (cursor) {
                        this.friends.push(...data.friends);
                    } else {
                        this.friends = data.friends;
                    }
                    this.friendsNextCursor = data.nextCursor;
                }
            } catch (e) {
                console.error('Error fetching friends:', e);
            }
        },

        async fetchRequests() {
            const authStore = useAuthStore();
            if (!authStore.user || !authStore.token) return;
            try {
                const res = await fetch(
                    `${ENV.API_URL}/social/requests/${authStore.user.id}`,
                    { headers: authHeaders() }
                );
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
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify({ requestId, status }),
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
