import { defineStore } from 'pinia';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../authStore';
import { Message } from '@shared/models';
import { ENV } from '../../utils/env';

export interface FriendRequest {
    id: string;
    direction: 'incoming' | 'outgoing';
    from_username?: string;
    to_username?: string;
}

export interface FriendResponse {
    requestId: string;
    status: 'accepted' | 'declined';
}

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
                onFriendRequest: (request: FriendRequest) => void;
                onFriendResponse: (data: FriendResponse) => void;
            }
        ) {
            const authStore = useAuthStore();
            if (!this.socket) {
                this.socket = io(ENV.SOCKET_URL, {
                    transports: ['websocket', 'polling'],
                    auth: { token: authStore.token }
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
        ): Promise<{ status: string, messageId?: string, error?: string }> {
            return new Promise((resolve) => {
                const authStore = useAuthStore();
                if (!this.socket || !authStore.user) {
                    return resolve({ status: 'error', error: 'No connection' });
                }

                const payload = {
                    authorId: authStore.user.id,
                    content,
                    attachmentUrl,
                    channelId: activeChannelId,
                    recipientId: activeRecipientId
                };

                this.socket.emit('send-message', payload, (response: any) => {
                    resolve(response);
                });
            });
        }
    }
});
