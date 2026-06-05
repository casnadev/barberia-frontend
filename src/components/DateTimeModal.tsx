import { useState } from 'react'
import { ArrowLeft, X, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'

interface DateTimeModalProps {
  isOpen: boolean
  selectedDate: string
  selectedTime: string
  selectedProfessional: {
    id: number
    name: string
    avatar?: string
  } | null
  onSelectDate: (date: string) => void
  onSelectTime: (time: string) => void
  onClose: () => void
  availableTimes?: string[]
}

export function DateTimeModal({
  isOpen,
  selectedDate,
  selectedTime,
  selectedProfessional,
  onSelectDate,
  onSelectTime,
  onClose,
  availableTimes = []
}: DateTimeModalProps) {
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

  // Default time slots if none provided
  const timeSlots = availableTimes.length > 0 ? availableTimes : [
    '11:25', '11:35', '12:25', '12:40', '12:55', '13:10', '13:25'
  ]

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
  }

  const getDayName = (date: Date) => {
    const names = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
    return names[date.getDay()]
  }

  const getMonthName = (date: Date) => {
    const names = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    return names[date.getMonth()]
  }

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

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(year, month - 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1))
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
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <h1 className="text-2xl font-bold text-gray-900 flex-1 ml-4">
            Seleccionar fecha y hora
          </h1>

          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="max-h-[70vh] overflow-y-auto">
          <div className="p-6">
            {/* Professional Selector Row */}
            <div className="flex items-center justify-between mb-8">
              {/* Left: Professional Selector */}
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0" />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {selectedProfessional ? selectedProfessional.name : 'Varios profesionales'}
                  </span>
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>

              {/* Right: Calendar Icon Button */}
              <button className="flex items-center justify-center w-10 h-10 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors flex-shrink-0">
                <Calendar className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* DATE SECTION */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-900 mb-4">
                Selecciona una fecha
              </h3>

              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={goToPreviousMonth}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm font-medium text-gray-700 capitalize min-w-max">
                  {getMonthName(currentMonth)}
                </span>
                <button
                  onClick={goToNextMonth}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Date Cards Grid */}
              <div className="grid grid-cols-5 gap-2">
                {days.map((day, index) => (
                  day === null ? (
                    <div key={`empty-${index}`} />
                  ) : (
                    <motion.button
                      key={day}
                      onClick={() => handleSelectDay(day)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`p-3 rounded-2xl font-semibold text-center transition-all duration-200 ${
                        isSelected(day)
                          ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg'
                          : 'bg-white border-2 border-gray-200 text-gray-900 hover:border-purple-300'
                      }`}
                    >
                      <div className="text-xs font-bold uppercase leading-tight">
                        {getDayName(new Date(year, month, day))}
                      </div>
                      <div className="text-lg font-bold leading-tight">
                        {day}
                      </div>
                      <div className="text-xs opacity-75 leading-tight">
                        {getMonthName(currentMonth).slice(0, 3)}
                      </div>
                    </motion.button>
                  )
                ))}
              </div>
            </div>

            {/* TIME SECTION */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-4">
                Escoge una hora
              </h3>

              <div className="space-y-2">
                {timeSlots.map((time) => (
                  <motion.button
                    key={time}
                    onClick={() => onSelectTime(time)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full p-4 rounded-2xl font-medium transition-all duration-200 ${
                      selectedTime === time
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                        : 'bg-gray-50 border-2 border-gray-200 text-gray-900 hover:border-purple-300'
                    }`}
                  >
                    {time}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
