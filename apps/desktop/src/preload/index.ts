import { contextBridge, ipcRenderer } from 'electron'
import { exposeElectronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
    // Access Token
    saveToken: (token: string) => ipcRenderer.invoke('auth:save-token', token),
    loadToken: () => ipcRenderer.invoke('auth:load-token'),
    clearToken: () => ipcRenderer.invoke('auth:clear-token'),

    // Refresh Token (guardat encriptat a refresh.bin via safeStorage)
    saveRefreshToken: (token: string) => ipcRenderer.invoke('auth:save-refresh-token', token),
    getRefreshToken: () => ipcRenderer.invoke('auth:get-refresh-token'),
    clearRefreshToken: () => ipcRenderer.invoke('auth:clear-refresh-token'),
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
    try {
        exposeElectronAPI()
        contextBridge.exposeInMainWorld('api', api)
    } catch (error) {
        console.error(error)
    }
} else {
    // @ts-ignore (define in d.ts)
    window.electron = exposeElectronAPI()
    // @ts-ignore (define in d.ts)
    window.api = api
}
