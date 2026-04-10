import { defineStore } from 'pinia';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../authStore';
import { Message } from '@shared/models';
import { ENV } from '../../utils/env';

export const useSocketStore = defineStore('socket', {
    state: () => ({
        socket: null as Socket | null,
    }),

    actions: {
        connect(
            activeChannelId: string | null,
            callbacks: {
                onMessage: (msg: Message) => void;
                onPresenceUpdate: (data: { userId: string, status: string }) => void;
                onFriendRequest: (request: any) => void;
                onFriendResponse: (data: any) => void;
            }
        ) {
            const authStore = useAuthStore();
            if (!this.socket) {
                this.socket = io(ENV.SOCKET_URL, {
                    transports: ['websocket', 'polling']
                });

                this.socket.on('connect', () => {
                    const user = authStore.user;
                    if (user) {
                        this.socket?.emit('join-user', user.id);
                        if (activeChannelId) {
                            this.socket?.emit('join-channel', activeChannelId);
                        }
                    }
                });

                this.socket.on('message', callbacks.onMessage);
                this.socket.on('presence-update', callbacks.onPresenceUpdate);
                this.socket.on('friend-request', callbacks.onFriendRequest);
                this.socket.on('friend-response', callbacks.onFriendResponse);
            }
        },

        sendMessage(
            content: string,
            activeChannelId: string | null,
            activeRecipientId: string | null,
            attachmentUrl?: string
        ) {
            const authStore = useAuthStore();
            if (!this.socket || !authStore.user) return;

            const payload = {
                authorId: authStore.user.id,
                content,
                attachmentUrl,
                channelId: activeChannelId,
                recipientId: activeRecipientId
            };

            this.socket.emit('send-message', payload);
        }
    }
});
