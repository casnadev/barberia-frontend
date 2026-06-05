import { useState } from 'react'
import { X, CheckCircle, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { confirmDialog } from '@/components/ConfirmDialog'

interface Reserva {
  idReserva: number
  nombreClienteSnap: string
  telefonoClienteSnap: string
  horaInicio: string
  horaFin: string
  estado: 'Pendiente' | 'Confirmada' | 'Atendida' | 'Cancelada'
  idTrabajador: number
  idServicio: number
  precioServicioSnap?: number
}

interface Props {
  reserva: Reserva
  onClose: () => void
  onConfirm: () => void
}

export function ReservaModal({ reserva, onClose, onConfirm }: Props) {
  const [loading, setLoading] = useState(false)

  const handleConfirmar = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/reservas/${reserva.idReserva}/confirmar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) throw new Error('Error confirmando')
      
      toast.success('Reserva confirmada')
      onConfirm()
      onClose()
    } catch (error) {
      toast.error('Error al confirmar')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelar = async () => {
    if (!(await confirmDialog({ title: 'Cancelar reserva', message: '¿Deseas cancelar esta reserva?', confirmText: 'Sí, cancelar', cancelText: 'Volver', tone: 'danger' }))) return
    
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/reservas/${reserva.idReserva}/cancelar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ motivo: 'Cancelada por administrador' })
      })

      if (!res.ok) throw new Error('Error cancelando')
      
      toast.success('Reserva cancelada')
      onConfirm()
      onClose()
    } catch (error) {
      toast.error('Error al cancelar')
    } finally {
      setLoading(false)
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Confirmada':
        return 'bg-blue-500/20 text-blue-400'
      case 'Pendiente':
        return 'bg-amber-500/20 text-amber-400'
      case 'Atendida':
        return 'bg-green-500/20 text-green-400'
      case 'Cancelada':
        return 'bg-red-500/20 text-red-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-barber-card border border-barber-border rounded-xl p-6 max-w-md w-full shadow-2xl"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Detalles de Reserva</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Estado */}
        <div className="mb-4">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getEstadoColor(reserva.estado)}`}>
            {reserva.estado}
          </span>
        </div>

        {/* Info */}
        <div className="space-y-4 mb-6 text-sm">
          <div>
            <p className="text-gray-400 mb-1">Cliente</p>
            <p className="text-white font-semibold">{reserva.nombreClienteSnap}</p>
            <p className="text-gray-500">{reserva.telefonoClienteSnap}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 mb-1">Hora</p>
              <p className="text-white font-semibold">
                {reserva.horaInicio.substring(0, 5)} - {reserva.horaFin.substring(0, 5)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">Precio</p>
              <p className="text-white font-semibold">S/ {reserva.precioServicioSnap?.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {reserva.estado === 'Pendiente' && (
            <>
              <button
                onClick={handleConfirmar}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Confirmar
              </button>
              <button
                onClick={handleCancelar}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Cancelar
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-barber-border rounded-lg hover:bg-barber-border/80 transition text-white"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
