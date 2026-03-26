import { defineConfig } from 'vite'

export default defineConfig({
  base: '/wine-scanner/',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js']
  }
})
