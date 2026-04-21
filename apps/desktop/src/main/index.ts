import { app, shell, BrowserWindow, ipcMain, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

// Must be called before app is ready
if (is.dev) {
    app.commandLine.appendSwitch('disable-web-security')
}
import { autoUpdater } from 'electron-updater'
import icon from '../../resources/icon.png?asset'
import { registerAuthHandlers } from './ipc/authHandlers'

// Variables globals equivalents a env per al Main Process
// Per prod, asumim que Vertex corre sota HTTPS al teu domini
const isDev = is.dev || !app.isPackaged;
const API_URL = import.meta.env.MAIN_VITE_API_URL ?? 'https://vertex.sergidalmau.dev/api/v1';

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;

// Funció per crear la finestra mare
function createMainWindow(): void {
    if (mainWindow) return;

    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        show: false,
        autoHideMenuBar: true,
        ...(process.platform === 'linux' ? { icon } : {}),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false
        }
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow?.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    // Load URL or File
    if (isDev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    // Si la Splash existeix encara, la matem perquè ja hem superat els controls
    if (splashWindow) {
        splashWindow.destroy()
        splashWindow = null
    }
}

// Funció per crear el "Pre-Launcher" o Splash Screen
function createSplashWindow(): void {
    splashWindow = new BrowserWindow({
        width: 400,
        height: 500,
        frame: false,
        transparent: process.platform !== 'linux',
        resizable: false,
        alwaysOnTop: true,
        show: false,
        ...(process.platform === 'linux' ? { icon } : {}),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false
        }
    })

    // Passem ?splash=true perquè el Vue renderitzi l'Splash
    if (isDev && process.env['ELECTRON_RENDERER_URL']) {
        splashWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?splash=true`)
    } else {
        splashWindow.loadFile(join(__dirname, '../renderer/index.html'), { query: { splash: 'true' } })
    }

    splashWindow.on('ready-to-show', () => {
        splashWindow?.show()
        // Un cop la SplashScreen està a la pantalla, iniciem els controls!
        runHealthCheckSequence()
    })
}

// ── HEALTH CHECK LÒGICA ──────────────────────────────────
function sendSplashStatus(message: string, isError = false, progress?: number) {
    if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send('splash:message', { message, isError, progress });
    }
}

async function checkServerHealth(retries = 3, delay = 5000): Promise<boolean> {
    for (let i = 0; i < retries; i++) {
        try {
            sendSplashStatus(`Connectant amb el servidor... (Intent ${i + 1}/${retries})`);
            const res = await fetch(`${API_URL}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'ok') return true;
            }
        } catch (error) {
            console.error(`Health check attempt ${i + 1} failed:`, error);
        }

        if (i < retries - 1) {
            // Wait before next retry
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    return false;
}

async function runHealthCheckSequence() {
    const isHealthy = await checkServerHealth();

    if (isHealthy) {
        // Seridor OK! Busquem actualitzacions.
        sendSplashStatus('Cercant actualitzacions...');

        if (isDev) {
            // En mode DEV, no volem que l'autoUpdater faci absolutament res.
            sendSplashStatus('Mode DEV: Actualitzacions desactivades.');
            autoUpdater.autoDownload = false;
            autoUpdater.autoInstallOnAppQuit = false;
            setTimeout(() => {
                createMainWindow();
            }, 500);
        } else {
            // Fem la comprovació real de Github Releases per a la versió empaquetada
            autoUpdater.checkForUpdates();
        }
    } else {
        // Mostrem Botons d'Error a l'Usuari per decidir què fer (IPC handle ho rescata)
        sendSplashStatus('No s\'ha pogut connectar amb Oracle Cloud.', true);
    }
}

// ── EVENT LISTENERS DE L'UPDATER ───────────────────────
autoUpdater.on('update-available', () => {
    sendSplashStatus('Nova versió trobada. Descarregant...');
});

autoUpdater.on('update-not-available', () => {
    sendSplashStatus('Versió al dia. Iniciant Verse...');
    createMainWindow();
});

autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Descarregant: " + Math.round(progressObj.percent) + '%';
    sendSplashStatus(log_message, false, progressObj.percent);
});

autoUpdater.on('update-downloaded', () => {
    sendSplashStatus('Actualització Llista! Reiniciant...', false, 100);
    setTimeout(() => {
        autoUpdater.quitAndInstall();
    }, 2000);
});

autoUpdater.on('error', (err) => {
    console.error('Error en updater:', err);
    sendSplashStatus('No s\'han pogut consultar les actualitzacions. Iniciant...', false);
    setTimeout(() => {
        createMainWindow();
    }, 1500);
});

// ── LIFECYCLE DE L'APP ─────────────────────────────────
app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.vertex')

    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    // Spoof Origin so server-side CORS/WS origin checks accept requests from file:// (packaged)
    // and localhost (dev). Server checks Origin header — Electron sends file:// which fails.
    session.defaultSession.webRequest.onBeforeSendHeaders(
        { urls: ['https://vertex.sergidalmau.dev/*', 'wss://vertex.sergidalmau.dev/*'] },
        (details, callback) => {
            callback({
                requestHeaders: {
                    ...details.requestHeaders,
                    Origin: 'https://vertex.sergidalmau.dev',
                },
            })
        }
    )

    // Override CORP header on uploads so Electron (file://) can load cross-origin media/images.
    // Server sends CORP: same-origin (helmet default) which Chromium blocks from file://.
    session.defaultSession.webRequest.onHeadersReceived(
        { urls: ['https://vertex.sergidalmau.dev/uploads/*'] },
        (details, callback) => {
            const headers = { ...details.responseHeaders }
            headers['cross-origin-resource-policy'] = ['cross-origin']
            callback({ responseHeaders: headers })
        }
    )

    // Registrar Handlers d'Auth
    registerAuthHandlers()

    // IPC per als botons de fracàs del Health Check
    ipcMain.on('splash:retry', () => {
        runHealthCheckSequence()
    })

    ipcMain.on('splash:quit', () => {
        app.quit()
    })

    // INICIEM AMB L'SPLASH EN LLOC DEL MAINWINDOW DIRECTE!
    createSplashWindow()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
