import { defineStore } from 'pinia';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration: number; // in milliseconds
}

export const useToastStore = defineStore('toast', {
    state: () => ({
        toasts: [] as Toast[],
    }),
    actions: {
        addToast(message: string, type: ToastType = 'info', duration: number = 8000) {
            const id = crypto.randomUUID();
            this.toasts.push({ id, message, type, duration });
            
            // The removal will be handled by the component using setTimeout,
            // or we could handle it here. Handling it here is simpler for state management.
            setTimeout(() => {
                this.removeToast(id);
            }, duration);
        },
        removeToast(id: string) {
            this.toasts = this.toasts.filter(toast => toast.id !== id);
            // We force a re-assignment to ensure reactivity is triggered properly
        }
    }
});
