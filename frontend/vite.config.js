import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy target: in Docker → http://api-gateway:8090, locally → http://localhost:8090
const API_TARGET = process.env.API_PROXY_TARGET || 'http://localhost:8090'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
      '/ws-chat': {
        target: API_TARGET,
        ws: true,
      },
    },
  },
})

