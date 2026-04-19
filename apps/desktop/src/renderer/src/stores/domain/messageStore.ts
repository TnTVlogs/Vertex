import { defineStore } from 'pinia';
import { useAuthStore } from '../authStore';
import { Message } from '@shared/models';
import { ENV } from '../../utils/env';

const MAX_MESSAGES = 200;

export const useMessageStore = defineStore('message', {
    state: () => ({
        messages: [] as Message[],
        isLoading: false,
        isLoadingOlder: false,
        hasMore: false,
        // Track the current conversation so loadOlderMessages knows where to fetch from
        _currentTargetId: null as string | null,
        _currentType: null as 'channel' | 'dm' | null,
    }),

    getters: {
        sortedMessages(state): Message[] {
            return [...state.messages].sort((a, b) => {
                const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
                const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
                return timeA - timeB;
            });
        }
    },

    actions: {
        async fetchMessages(targetId: string, type: 'channel' | 'dm') {
            const authStore = useAuthStore();
            if (!authStore.user) return;
            this.isLoading = true;
            this._currentTargetId = targetId;
            this._currentType = type;
            try {
                const url = new URL(`${ENV.API_URL}/messages/${targetId}`);
                url.searchParams.append('type', type);
                url.searchParams.append('userId', authStore.user.id);

                const res = await fetch(url.toString(), {
                    headers: { Authorization: `Bearer ${authStore.token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    this.messages = data.messages;
                    this.hasMore = data.hasMore;
                }
            } catch (e) {
                console.error('Error fetching messages:', e);
            } finally {
                this.isLoading = false;
            }
        },

        async loadOlderMessages() {
            const authStore = useAuthStore();
            if (!authStore.user || !this._currentTargetId || !this._currentType) return;
            if (this.isLoadingOlder || !this.hasMore) return;

            const oldest = this.sortedMessages[0];
            if (!oldest) return;

            this.isLoadingOlder = true;
            try {
                const url = new URL(`${ENV.API_URL}/messages/${this._currentTargetId}`);
                url.searchParams.append('type', this._currentType);
                url.searchParams.append('userId', authStore.user.id);
                url.searchParams.append('before', new Date(oldest.createdAt).toISOString());

                const res = await fetch(url.toString(), {
                    headers: { Authorization: `Bearer ${authStore.token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    // Prepend older messages, avoiding duplicates
                    const existingIds = new Set(this.messages.map(m => m.id));
                    const newMessages = (data.messages as Message[]).filter(m => !existingIds.has(m.id));
                    const combined = [...newMessages, ...this.messages];
                    this.messages = combined.length > MAX_MESSAGES ? combined.slice(-MAX_MESSAGES) : combined;
                    this.hasMore = data.hasMore;
                }
            } catch (e) {
                console.error('Error loading older messages:', e);
            } finally {
                this.isLoadingOlder = false;
            }
        },

        clearMessages() {
            this.messages = [];
            this.hasMore = false;
            this._currentTargetId = null;
            this._currentType = null;
        },

        addMessage(msg: Message) {
            // If we receive a message that matches an optimistic one (same content/author/recipient), replace it
            const existingIndex = this.messages.findIndex(m => 
                m.status === 'sending' && 
                m.content === msg.content && 
                m.authorId === msg.authorId
            );

            if (existingIndex !== -1) {
                this.messages[existingIndex] = { ...msg, status: 'sent' };
            } else {
                this.messages.push({ ...msg, status: 'sent' });
            }

            if (this.messages.length > MAX_MESSAGES) {
                this.messages = this.messages.slice(-MAX_MESSAGES);
            }
        },

        addOptimisticMessage(msg: Message) {
            this.messages.push({ ...msg, status: 'sending' });
            if (this.messages.length > MAX_MESSAGES) {
                this.messages = this.messages.slice(-MAX_MESSAGES);
            }
            return msg.id; // temp id
        },

        updateMessageStatus(tempId: string, status: 'sent' | 'error' | 'sending', realId?: string) {
            const msg = this.messages.find(m => m.id === tempId);
            if (msg) {
                msg.status = status;
                if (realId) msg.id = realId;
            }
        }
    }
});
