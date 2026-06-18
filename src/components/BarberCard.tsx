import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

interface BarberCardProps {
  id: number
  name: string
  role: string
  avatar?: string
  profileLink?: string
  isSelected?: boolean
  onSelect?: () => void
}

export function BarberCard({
  id,
  name,
  role,
  avatar,
  profileLink,
  isSelected = false,
  onSelect
}: BarberCardProps) {
  const [imgError, setImgError] = useState(false)
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
          relative rounded-2xl p-4 border-2 transition-all duration-200
          ${isSelected 
            ? 'bg-white shadow-lg' 
            : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
          }
        `}>
          <div className="flex items-center justify-between gap-3">
            {/* LEFT: Avatar and Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Avatar Circle */}
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-300 overflow-hidden shadow-sm">
                {avatar && !imgError ? (
                  <img
                    src={avatar}
                    alt={name}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <span className="text-base font-semibold text-gray-600">
                      {name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0">
                {/* Name */}
                <h3 className="text-base font-semibold text-gray-900 leading-tight">
                  {name}
                </h3>

                {/* Role */}
                <p className="text-sm text-gray-500 leading-tight">
                  {role}
                </p>

                {/* Profile Link */}
                {profileLink && (
                  <a
                    href={profileLink}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors mt-0.5 inline-block"
                  >
                    Ver perfil
                  </a>
                )}
              </div>
            </div>

            {/* RIGHT: Check Circle or Select Button */}
            {isSelected ? (
              <motion.div
                initial={false}
                animate={{
                  scale: 1,
                  opacity: 1
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                style={{ backgroundColor: 'var(--brand, #2855F6)' }}
                className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 shadow-lg"
              >
                <Check 
                  className="w-5 h-5 text-white"
                  strokeWidth={3}
                />
              </motion.div>
            ) : (
              <motion.div
                initial={false}
                animate={{
                  scale: 0.85,
                  opacity: 0.5
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="px-4 py-2 border-2 border-gray-200 rounded-full text-sm font-medium text-gray-700 whitespace-nowrap flex-shrink-0 hover:border-gray-300 transition-colors"
              >
                Seleccionar
              </motion.div>
            )}
          </div>
        </div>
      </motion.button>
    </motion.div>
  )
}
