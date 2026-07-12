import { useNavigate } from 'react-router-dom'
import { WarningCircle as AlertCircle } from '@phosphor-icons/react'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gradient-to-br from-barber-dark to-barber-card flex items-center justify-center p-4">
      <div className="text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-white mb-2">404</h1>
        <p className="text-slate-400 mb-6">Página no encontrada</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2 bg-barber-accent text-white rounded-lg hover:shadow-lg transition"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  )
}
