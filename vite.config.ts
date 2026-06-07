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
  // En producción elimina console.* (incluido el log por request del apiClient)
  esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : {},
  build: {
    rollupOptions: {
      output: {
        // ← Junta librerías en chunks propios. Lo clave: 'icons' agrupa TODOS
        //   los íconos de lucide-react en UN solo archivo, en vez de ~30 chunks
        //   minúsculos que antes bajaban uno por uno.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'icons': ['lucide-react'],                                  // ← NUEVO
          'vendor': ['axios', '@tanstack/react-query', 'zustand',     // ← NUEVO
                     'date-fns', 'sonner', 'clsx'],
          'charts': ['recharts'],
          'motion': ['framer-motion'],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
}))