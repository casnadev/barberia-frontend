import { useState } from 'react'
import { CaretLeft as ChevronLeft, CaretRight as ChevronRight, X } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import styles from '@/styles/ReservaClientePage.module.css'

interface CalendarModalProps {
  isOpen: boolean
  selectedDate: string
  onSelectDate: (date: string) => void
  onClose: () => void
  /** Si es true, permite elegir fechas pasadas (uso del Admin para consultar citas viejas). */
  allowPast?: boolean
}

export function CalendarModal({ isOpen, selectedDate, onSelectDate, onClose, allowPast = false }: CalendarModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  if (!isOpen) return null

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  const days: (number | null)[] = []
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleSelectDay = (day: number | null) => {
    if (day === null) return
    const date = new Date(year, month, day)
    onSelectDate(formatDateForAPI(date))
    onClose()
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(year, month - 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1))
  }

  const monthName = currentMonth.toLocaleString('es', { month: 'long', year: 'numeric' })
  const dayNames = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

  const isToday = (day: number) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    )
  }

  const isSelected = (day: number) => {
    if (!selectedDate) return false
    const [selYear, selMonth, selDay] = selectedDate.split('-')
    return (
      day === parseInt(selDay) &&
      month === parseInt(selMonth) - 1 &&
      year === parseInt(selYear)
    )
  }

  const isPast = (day: number) => {
    const d = new Date(year, month, day)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    return d < hoy
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Selecciona una fecha</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={goToPreviousMonth}
              className="text-gray-600 hover:text-gray-900 transition"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 capitalize min-w-max">
              {monthName}
            </h3>
            <button
              onClick={goToNextMonth}
              className="text-gray-600 hover:text-gray-900 transition"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-4">
            {dayNames.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-semibold text-gray-500"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              const past = day !== null && isPast(day)
              const blocked = past && !allowPast
              const selected = day !== null && isSelected(day)
              const today = day !== null && isToday(day)
              return (
                <button
                  key={index}
                  onClick={() => handleSelectDay(day)}
                  disabled={day === null || blocked}
                  style={
                    selected
                      ? { backgroundColor: 'var(--brand, #2855F6)', color: '#fff' }
                      : today
                        ? { borderColor: 'var(--brand, #2855F6)', color: 'var(--brand, #2855F6)' }
                        : undefined
                  }
                  className={`
                    aspect-square rounded-lg font-semibold text-sm transition
                    ${day === null ? 'bg-transparent cursor-default' : ''}
                    ${blocked ? 'bg-gray-50 text-gray-300 cursor-not-allowed' : ''}
                    ${today && !selected ? 'border-2' : ''}
                    ${day && !blocked && !today && !selected ? 'bg-gray-100 text-gray-900 hover:bg-gray-200' : ''}
                  `}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}