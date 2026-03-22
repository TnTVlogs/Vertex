import { contextBridge, ipcRenderer } from 'electron'
import { exposeElectronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
    saveToken: (token: string) => ipcRenderer.invoke('auth:save-token', token),
    loadToken: () => ipcRenderer.invoke('auth:load-token'),
    clearToken: () => ipcRenderer.invoke('auth:clear-token')
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
