import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // NUEVO: en producción elimina console.* (incluido el log por request del apiClient)
  esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : {},
  // NUEVO: separa librerías pesadas en chunks propios (se cachean aparte)
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
}))