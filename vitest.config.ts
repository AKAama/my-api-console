import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { url: 'https://portfolio.test/' },
    },
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
  },
});
