import { app, ipcMain, safeStorage } from 'electron';
import { join } from 'path';
import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';

const TOKEN_PATH = join(app.getPath('userData'), 'session.bin');
const REFRESH_TOKEN_PATH = join(app.getPath('userData'), 'refresh.bin');

export function registerAuthHandlers() {
    // ── ACCESS TOKEN (session.bin) ───────────────────────────────────────────────
    ipcMain.handle('auth:save-token', async (_, token: string) => {
        try {
            if (!token || typeof token !== 'string') {
                console.error('Failed to save token: token is undefined or not a string');
                return false;
            }
            if (!safeStorage.isEncryptionAvailable()) return false;
            const encrypted = safeStorage.encryptString(token);
            writeFileSync(TOKEN_PATH, encrypted);
            return true;
        } catch (e) {
            console.error('Failed to save token:', e);
            return false;
        }
    });

    ipcMain.handle('auth:load-token', async () => {
        try {
            if (!existsSync(TOKEN_PATH)) return null;
            if (!safeStorage.isEncryptionAvailable()) return null;
            const encrypted = readFileSync(TOKEN_PATH);
            return safeStorage.decryptString(encrypted);
        } catch (e) {
            console.error('Failed to load token:', e);
            return null;
        }
    });

    ipcMain.handle('auth:clear-token', async () => {
        try {
            if (existsSync(TOKEN_PATH)) {
                unlinkSync(TOKEN_PATH);
            }
            return true;
        } catch (e) {
            console.error('Failed to clear token:', e);
            return false;
        }
    });

    // ── REFRESH TOKEN (refresh.bin) ──────────────────────────────────────────────
    ipcMain.handle('auth:save-refresh-token', async (_, token: string) => {
        try {
            if (!token || typeof token !== 'string') {
                console.error('Failed to save refresh token: token is undefined or not a string');
                return false;
            }
            if (!safeStorage.isEncryptionAvailable()) return false;
            const encrypted = safeStorage.encryptString(token);
            writeFileSync(REFRESH_TOKEN_PATH, encrypted);
            return true;
        } catch (e) {
            console.error('Failed to save refresh token:', e);
            return false;
        }
    });

    ipcMain.handle('auth:get-refresh-token', async () => {
        try {
            if (!existsSync(REFRESH_TOKEN_PATH)) return null;
            if (!safeStorage.isEncryptionAvailable()) return null;
            const encrypted = readFileSync(REFRESH_TOKEN_PATH);
            return safeStorage.decryptString(encrypted);
        } catch (e) {
            console.error('Failed to get refresh token:', e);
            return null;
        }
    });

    ipcMain.handle('auth:clear-refresh-token', async () => {
        try {
            if (existsSync(REFRESH_TOKEN_PATH)) {
                unlinkSync(REFRESH_TOKEN_PATH);
            }
            return true;
        } catch (e) {
            console.error('Failed to clear refresh token:', e);
            return false;
        }
    });
}
