export const notificationService = {
    async requestPermission(): Promise<void> {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    },

    notify(title: string, body: string): void {
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;
        if (document.visibilityState === 'visible') return;
        new Notification(title, { body });
    },
};
