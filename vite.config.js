import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': '/src' }
  },
  server: {
    proxy: {
      '/api/odpt': {
        target: 'https://api.odpt.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/odpt/, '/api/v4'),
      },
      '/api/heartrails': {
        target: 'https://express.heartrails.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/heartrails/, '/api/json'),
      },
    },
  },
})

