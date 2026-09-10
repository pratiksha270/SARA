import { defineConfig } from 'vite'

export default defineConfig({
  // Serve the parent `frontend` folder as static public files so we can reuse
  // existing images like bg.png, warehouse.jpeg, relief.jpeg (no binary copy needed).
  publicDir: '../',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      }
    }
  }
})
