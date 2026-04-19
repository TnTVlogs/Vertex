import { defineStore } from 'pinia';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../authStore';
import { Message } from '@shared/models';
import { ENV } from '../../utils/env';
import { notificationService } from '../../services/notificationService';

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
        typingUsers: {} as Record<string, { channelId?: string; recipientId?: string }>,
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
                    notificationService.requestPermission();
                });

                this.socket.on('message', (msg: Message) => {
                    callbacks.onMessage(msg);
                    const currentUserId = authStore.user?.id;
                    if (msg.authorId !== currentUserId) {
                        const sender = (msg as any).author?.username ?? 'Someone';
                        notificationService.notify(`New message from ${sender}`, msg.content);
                    }
                });
                this.socket.on('presence-update', callbacks.onPresenceUpdate);
                this.socket.on('friend-request', (request: FriendRequest) => {
                    callbacks.onFriendRequest(request);
                    const from = request.from_username ?? 'Someone';
                    notificationService.notify('Friend Request', `${from} sent you a friend request`);
                });
                this.socket.on('friend-response', callbacks.onFriendResponse);

                this.socket.on('typing', (data: { userId: string; channelId?: string; recipientId?: string }) => {
                    this.typingUsers[data.userId] = { channelId: data.channelId, recipientId: data.recipientId };
                });
                this.socket.on('stop-typing', (data: { userId: string }) => {
                    delete this.typingUsers[data.userId];
                });
            }
        },

        joinChannel(channelId: string) {
            this.socket?.emit('join-channel', channelId);
        },

        emitTyping(channelId?: string | null, recipientId?: string | null) {
            if (!this.socket) return;
            this.socket.emit('typing', { channelId: channelId ?? undefined, recipientId: recipientId ?? undefined });
        },

        emitStopTyping(channelId?: string | null, recipientId?: string | null) {
            if (!this.socket) return;
            this.socket.emit('stop-typing', { channelId: channelId ?? undefined, recipientId: recipientId ?? undefined });
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
                    if (response?.success === false && response?.error?.message) {
                        resolve({ status: 'error', error: response.error.message });
                    } else {
                        resolve(response);
                    }
                });
            });
        }
    }
});
