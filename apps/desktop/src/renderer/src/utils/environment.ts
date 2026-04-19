export const isElectron = (): boolean => {
    return typeof window !== 'undefined' && typeof window.api !== 'undefined';
};

export const SecureStorage = {
    async loadToken(): Promise<string | null> {
        if (isElectron()) {
            return await window.api.loadToken();
        }
        return localStorage.getItem('vertex_access_token');
    },

    async saveToken(token: string): Promise<void> {
        if (isElectron()) {
            await window.api.saveToken(token);
        } else {
            localStorage.setItem('vertex_access_token', token);
        }
    },

    async clearToken(): Promise<void> {
        if (isElectron()) {
            await window.api.clearToken();
        } else {
            localStorage.removeItem('vertex_access_token');
        }
    },

    async getRefreshToken(): Promise<string | null> {
        if (isElectron()) {
            return await window.api.getRefreshToken();
        }
        return localStorage.getItem('vertex_refresh_token');
    },

    async saveRefreshToken(token: string): Promise<void> {
        if (isElectron()) {
            await window.api.saveRefreshToken(token);
        } else {
            localStorage.setItem('vertex_refresh_token', token);
        }
    },

    async clearRefreshToken(): Promise<void> {
        if (isElectron()) {
            await window.api.clearRefreshToken();
        } else {
            localStorage.removeItem('vertex_refresh_token');
        }
    }
};
