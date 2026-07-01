import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

interface ServiceCardProps {
  id: number
  title: string
  duration: string
  description: string
  price: number
  currency?: string
  isSelected?: boolean
  onSelect?: () => void
}

export function ServiceCard({
  id,
  title,
  duration,
  description,
  price,
  currency = 'PEN',
  isSelected = false,
  onSelect
}: ServiceCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="w-full"
    >
      <motion.button
        onClick={onSelect}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.99 }}
        className="w-full text-left transition-all duration-200"
      >
        <div
          style={isSelected ? { borderColor: 'var(--brand, #2855F6)' } : undefined}
          className={`
          relative rounded-xl p-4 border-2 transition-all duration-200
          ${isSelected 
            ? 'bg-white shadow-lg' 
            : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
          }
        `}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <h3 className="text-base font-semibold text-gray-900 leading-tight truncate">{title}</h3>
                <span className="text-xs font-medium text-gray-400 flex-shrink-0">{duration}</span>
              </div>
              <p className="text-sm text-gray-600 leading-snug line-clamp-2 mt-1">{description}</p>
              <div className="text-base font-semibold text-gray-900 mt-2">
                <span className="text-sm font-normal text-gray-500">{currency}</span> {price.toFixed(2)}
              </div>
            </div>
            <motion.div
              initial={false}
              animate={{ scale: isSelected ? 1 : 0.85, opacity: isSelected ? 1 : 0.5 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              style={isSelected ? { backgroundColor: 'var(--brand, #2855F6)' } : undefined}
              className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 transition-all duration-200 ${isSelected ? 'shadow-md' : 'bg-gray-200'}`}
            >
              <Check className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-400'}`} strokeWidth={3} />
            </motion.div>
          </div>
        </div>
      </motion.button>
    </motion.div>
  )
}
