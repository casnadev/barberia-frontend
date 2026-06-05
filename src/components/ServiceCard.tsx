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
          relative rounded-2xl p-5 border-2 transition-all duration-200
          ${isSelected 
            ? 'bg-white shadow-lg' 
            : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
          }
        `}>
          {/* LAYOUT: Grid 3 columns - Title/Duration | Description | Price/Check */}
          <div className="grid grid-cols-1 gap-4">
            {/* LEFT SECTION: Title & Duration */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 leading-tight mb-1.5">
                  {title}
                </h3>
                <p className="text-xs font-medium text-gray-500">
                  {duration}
                </p>
              </div>
            </div>

            {/* MIDDLE SECTION: Description */}
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
              {description}
            </p>

            {/* BOTTOM SECTION: Price & Check Circle */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              {/* LEFT: Price */}
              <div className="text-base font-semibold text-gray-900">
                <span className="text-sm font-normal text-gray-600">{currency}</span>
                {' '}
                {price.toFixed(2)}
              </div>

              {/* RIGHT: Check Circle */}
              <motion.div
                initial={false}
                animate={{
                  scale: isSelected ? 1 : 0.85,
                  opacity: isSelected ? 1 : 0.5
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                style={isSelected ? { backgroundColor: 'var(--brand, #2855F6)' } : undefined}
                className={`
                  flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 transition-all duration-200
                  ${isSelected 
                    ? 'shadow-lg' 
                    : 'bg-gray-200'
                  }
                `}
              >
                <Check 
                  className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-400'}`}
                  strokeWidth={3}
                />
              </motion.div>
            </div>
          </div>
        </div>
      </motion.button>
    </motion.div>
  )
}
