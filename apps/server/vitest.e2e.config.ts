import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.e2e.ts'],
    // No setupFiles — e2e tests use real services, not prisma mock
    testTimeout: 15000,
  },
});
