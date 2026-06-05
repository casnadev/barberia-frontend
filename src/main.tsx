import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { Toaster } from 'sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './styles/variables.css'
import './styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 }
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  </React.StrictMode>
)
