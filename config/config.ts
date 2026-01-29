import { defineConfig } from 'umi';

export default defineConfig({
  npmClient: 'npm',
  routes: [
    {
      path: '/',
      component: '@/pages/index',
    },
  ],
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
});

