import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/did-api': {
        target: 'https://api.d-id.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/did-api/, ''),
      },
    },
  },
})
