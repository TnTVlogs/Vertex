import { defineStore } from 'pinia';
import { useAuthStore } from '../authStore';
import { Message } from '@shared/models';

export const useMessageStore = defineStore('message', {
    state: () => ({
        messages: [] as Message[],
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
            try {
                const url = new URL(`${import.meta.env.VITE_API_URL}/messages/${targetId}`);
                url.searchParams.append('type', type);
                url.searchParams.append('userId', authStore.user.id);

                const res = await fetch(url.toString());
                if (res.ok) {
                    this.messages = await res.json();
                }
            } catch (e) {
                console.error('Error fetching messages:', e);
            }
        },

        clearMessages() {
            this.messages = [];
        },

        addMessage(msg: Message) {
            this.messages.push(msg);
        }
    }
});
