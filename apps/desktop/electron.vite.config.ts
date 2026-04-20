import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()]
    },
    preload: {
        plugins: [externalizeDepsPlugin()]
    },
    renderer: {
        base: process.env.WEB_BUILD === 'true' ? '/app/' : './',
        resolve: {
            alias: {
                '@renderer': resolve('src/renderer/src'),
                '@shared': resolve('../../packages/shared')
            }
        },
        plugins: [vue()],
        server: {
            proxy: {
                '/api': {
                    target: 'https://vertex.sergidalmau.dev',
                    changeOrigin: true,
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
            }
        }
    }
})
