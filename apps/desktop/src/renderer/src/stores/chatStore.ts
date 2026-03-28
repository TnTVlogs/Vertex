import { defineStore } from 'pinia'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from './authStore'
import { Message, User } from '@shared/models'

console.log('chatStore.ts: script loading');

export const useChatStore = defineStore('chat', {
    state: () => ({
        _debug: 'chatStore-v4-options',
        messages: [] as Message[],
        friends: [] as User[],
        friendRequests: [] as any[],
        servers: [] as any[],
        channels: [] as any[],
        socket: null as Socket | null,
        activeChannelId: null as string | null,
        activeRecipientId: null as string | null,
    }),

    getters: {
        sortedMessages(state): Message[] {
            return [...state.messages].sort((a, b) => {
                const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
                const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
                return timeA - timeB
            })
        }
    },

    actions: {
        async fetchFriends() {
            const authStore = useAuthStore()
            if (!authStore.user) return
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/social/friends/${authStore.user.id}`)
                if (res.ok) {
                    this.friends = await res.json()
                    console.log('chatStore: friends updated', this.friends.length);
                }
            } catch (e) { console.error('Error fetching friends:', e) }
        },

        async fetchServers() {
            const authStore = useAuthStore()
            if (!authStore.user) return
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/servers/user/${authStore.user.id}`)
                if (res.ok) {
                    this.servers = await res.json()
                }
            } catch (e) { console.error('Error fetching servers:', e) }
        },

        async fetchRequests() {
            const authStore = useAuthStore()
            if (!authStore.user) return
            try {
                const url = `${import.meta.env.VITE_API_URL}/social/requests/${authStore.user.id}`;
                console.log('chatStore: fetching requests from', url);
                const res = await fetch(url)
                if (res.ok) {
                    this.friendRequests = await res.json()
                    console.log('chatStore: requests loaded', this.friendRequests.length);
                } else {
                    console.error('chatStore: fetchRequests status error', res.status);
                }
            } catch (e) { console.error('Error fetching requests:', e) }
        },

        async respondToRequest(requestId: string, status: 'accepted' | 'declined') {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/social/request/respond`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requestId, status })
                })
                if (res.ok) {
                    await this.fetchRequests()
                    if (status === 'accepted') await this.fetchFriends()
                }
            } catch (e) { console.error('Error responding to request:', e) }
        },

        async fetchChannels(serverId: string) {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/servers/${serverId}/channels`)
                if (res.ok) {
                    this.channels = await res.json()
                }
            } catch (e) { console.error('Error fetching channels:', e) }
        },

        async fetchMessages(targetId: string, type: 'channel' | 'dm') {
            const authStore = useAuthStore()
            if (!authStore.user) return
            try {
                const url = new URL(`${import.meta.env.VITE_API_URL}/messages/${targetId}`);
                url.searchParams.append('type', type);
                url.searchParams.append('userId', authStore.user.id);

                const res = await fetch(url.toString())
                if (res.ok) {
                    this.messages = await res.json()
                }
            } catch (e) { console.error('Error fetching messages:', e) }
        },

        connect() {
            const authStore = useAuthStore()
            if (!this.socket) {
                console.log('chatStore: connecting socket...');
                this.socket = io(import.meta.env.VITE_SOCKET_URL, {
                    transports: ['websocket', 'polling']
                })

                this.socket.on('connect', () => {
                    const user = authStore.user;
                    if (user) {
                        this.socket?.emit('join-user', user.id)
                        if (this.activeChannelId) {
                            this.socket?.emit('join-channel', this.activeChannelId)
                        }
                    }
                })

                this.socket.on('message', (msg: Message) => {
                    this.messages.push(msg)
                })

                this.socket.on('presence-update', (data: { userId: string, status: string }) => {
                    const friend = this.friends.find(f => f.id === data.userId)
                    if (friend) friend.status = data.status as any
                })

                this.socket.on('friend-request', (request: any) => {
                    this.friendRequests.push(request)
                })

                this.socket.on('friend-response', async (data: any) => {
                    this.friendRequests = this.friendRequests.filter(r => r.id !== data.requestId)
                    if (data.status === 'accepted') {
                        await this.fetchFriends()
                    }
                })
            }
        },

        sendMessage(content: string, attachmentUrl?: string) {
            const authStore = useAuthStore()
            if (!this.socket || !authStore.user) return

            const payload = {
                authorId: authStore.user.id,
                content,
                attachmentUrl,
                channelId: this.activeChannelId,
                recipientId: this.activeRecipientId
            }

            this.socket.emit('send-message', payload)
        }
    }
})
