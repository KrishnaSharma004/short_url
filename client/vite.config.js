import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In dev the React app runs on :5173 and proxies /api to the Express server,
// so cookies stay same-origin. In production Express serves client/dist itself.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8001' },
  },
})
