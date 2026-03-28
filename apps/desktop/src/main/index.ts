import { app, shell, BrowserWindow, ipcMain, safeStorage } from 'electron'
import { join } from 'path'
import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from './resources/icon.png?asset'

function createWindow(): void {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 900,
        height: 670,
        show: false,
        autoHideMenuBar: true,
        ...(process.platform === 'linux' ? { icon } : {}),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false
        }
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.electron')

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    createWindow()

    app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// ── ACCESS TOKEN (session.bin) ───────────────────────────────────────────────
const TOKEN_PATH = join(app.getPath('userData'), 'session.bin');

ipcMain.handle('auth:save-token', async (_, token: string) => {
    try {
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
const REFRESH_TOKEN_PATH = join(app.getPath('userData'), 'refresh.bin');

ipcMain.handle('auth:save-refresh-token', async (_, token: string) => {
    try {
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
