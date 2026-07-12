import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, SignOut as LogOut } from '@phosphor-icons/react'
import { useAuthStore } from '@/store/authStore'

export function TrabajadorAgendaPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuthStore()

  return (
    <div className="min-h-screen bg-gradient-to-br from-barber-dark to-barber-card">
      <div className="bg-barber-card border-b border-barber-border p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Calendar className="w-8 h-8 text-barber-accent" />
            <h1 className="text-3xl font-bold text-white">Mi Agenda</h1>
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-barber-card border border-barber-border rounded-xl p-8 text-center">
          <Calendar className="w-16 h-16 text-barber-accent/50 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Mis Citas - {user?.nombreCompleto}</h2>
          <p className="text-slate-400">Tus reservas asignadas aparecerán aquí</p>
        </motion.div>
      </div>
    </div>
  )
}
