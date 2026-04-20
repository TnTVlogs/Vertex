import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
    root: resolve(__dirname, 'src/renderer'),
    resolve: {
        alias: {
            '@renderer': resolve(__dirname, 'src/renderer/src'),
            '@shared': resolve(__dirname, '../../packages/shared'),
        },
    },
    plugins: [vue()],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'https://vertex.sergidalmau.dev',
                changeOrigin: true,
                secure: true,
            },
            '/socket.io': {
                target: 'https://vertex.sergidalmau.dev',
                changeOrigin: true,
                ws: true,
            },
            '/uploads': {
                target: 'https://vertex.sergidalmau.dev',
                changeOrigin: true,
            },
        },
    },
})
