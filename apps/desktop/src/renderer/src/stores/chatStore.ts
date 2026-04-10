import { defineStore } from 'pinia';
import { useSocketStore } from './domain/socketStore';
import { useFriendStore } from './domain/friendStore';
import { useServerStore } from './domain/serverStore';
import { useMessageStore } from './domain/messageStore';

import { useNavigationStore } from './navigationStore';

export const useChatStore = defineStore('chat', {
    state: () => ({
        // State moved to navigationStore for single source of truth
    }),

    getters: {
        activeChannelId: () => useNavigationStore().activeChannelId,
        activeRecipientId: () => useNavigationStore().activeRecipientId,
        messages: () => useMessageStore().messages,
        sortedMessages: () => useMessageStore().sortedMessages,
        friends: () => useFriendStore().friends,
        friendRequests: () => useFriendStore().friendRequests,
        servers: () => useServerStore().servers,
        channels: () => useServerStore().channels,
        socket: () => useSocketStore().socket,
    },

    actions: {
        async fetchFriends() {
            return useFriendStore().fetchFriends();
        },

        async fetchServers() {
            return useServerStore().fetchServers();
        },

        async fetchRequests() {
            return useFriendStore().fetchRequests();
        },

        async respondToRequest(requestId: string, status: 'accepted' | 'declined') {
            return useFriendStore().respondToRequest(requestId, status);
        },

        async fetchChannels(serverId: string) {
            return useServerStore().fetchChannels(serverId);
        },

        async fetchMessages(targetId: string, type: 'channel' | 'dm') {
            return useMessageStore().fetchMessages(targetId, type);
        },

        clearMessages() {
            return useMessageStore().clearMessages();
        },

        connect() {
            const friendStore = useFriendStore();
            const messageStore = useMessageStore();

            useSocketStore().connect(this.activeChannelId, {
                onMessage: (msg) => {
                    messageStore.addMessage(msg);
                },
                onPresenceUpdate: (data) => {
                    friendStore.updatePresence(data.userId, data.status);
                },
                onFriendRequest: (request) => {
                    friendStore.addRequest(request);
                },
                onFriendResponse: (data) => {
                    friendStore.handleResponse(data);
                }
            });
        },

        sendMessage(content: string, attachmentUrl?: string) {
            useSocketStore().sendMessage(
                content,
                this.activeChannelId,
                this.activeRecipientId,
                attachmentUrl
            );
        }
    }
});
