import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { Toaster } from 'sonner'
import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query'
import './styles/variables.css'
import './styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Datos "frescos" 5 min: revisitar una sección NO vuelve a pedir al servidor.
      staleTime: 1000 * 60 * 5,
      // Mantén la caché 30 min tras dejar de usarla (navegación ida/vuelta instantánea).
      gcTime: 1000 * 60 * 30,
      retry: 1,
      // CLAVE para que navegar "entre botones" no parpadee: al cambiar de filtro,
      // rango o página, React Query CONSERVA los datos anteriores en pantalla
      // mientras llegan los nuevos, en vez de blanquear y mostrar el spinner.
      placeholderData: keepPreviousData,
      // Evita recargas sorpresa (con su spinner) cada vez que vuelves a la pestaña.
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster position="top-center" richColors duration={3500} closeButton />
    </QueryClientProvider>
  </React.StrictMode>
)
