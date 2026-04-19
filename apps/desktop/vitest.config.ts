import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src'),
      '@shared': resolve(__dirname, '../../packages/shared')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/renderer/src/**/*.{test,spec}.{js,ts,vue}'],
    setupFiles: ['./src/renderer/src/__tests__/setup.ts']
  }
});
