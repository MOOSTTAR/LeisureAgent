import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { User, Robot } from '@phosphor-icons/react'
import type { BubbleConfig, ChatMessage } from './types'
import { BUBBLE_COLORS, ANIMATION_TYPES } from './constants'

// ── DecorativeBubble ─────────────────────────────────────────

function DecorativeBubble({
  config,
  scrollDirection,
  scrollVelocity,
}: {
  config: BubbleConfig
  scrollDirection: 'up' | 'down' | null
  scrollVelocity: number
}) {
  const getAnimate = () => {
    const dir = scrollDirection === 'up' ? 1 : scrollDirection === 'down' ? -1 : 0
    const factor = dir * Math.min(scrollVelocity, 1)

    switch (config.animationType) {
      case 'scale': {
        const baseScale = 0.6 + Math.random() * 0.4
        const scaleDelta = 0.3 + config.amplitude * 0.5
        return { scale: baseScale + factor * scaleDelta }
      }
      case 'translate': {
        const distX = config.offsetX * (0.3 + config.amplitude * 0.7)
        const distY = config.offsetY * (0.3 + config.amplitude * 0.7)
        return { x: factor * distX, y: factor * distY }
      }
      case 'count':
        return { opacity: 0.15 + factor * 0.7 }
      case 'irregular':
        return {
          rotate: config.initialRotation + factor * 90 * config.amplitude,
          x: factor * config.offsetX * 1.2,
          y: factor * config.offsetY * 1.2,
          scale: scrollDirection ? 0.7 + Math.abs(factor) * 0.8 : 0.75,
        }
      default:
        return {}
    }
  }

  return (
    <motion.div
      className={`absolute rounded-full ${config.color}`}
      style={{
        width: config.size,
        height: config.size,
        left: `calc(50% + ${config.offsetX}px)`,
        top: `calc(50% + ${config.offsetY}px)`,
      }}
      animate={getAnimate()}
      transition={{
        type: 'spring',
        stiffness: 80 + config.speed * 40,
        damping: 12,
        mass: 0.3,
      }}
    />
  )
}

// ── MessageBubble ────────────────────────────────────────────

export function MessageBubble({
  message,
  scrollDirection,
  scrollVelocity,
}: {
  message: ChatMessage
  scrollDirection: 'up' | 'down' | null
  scrollVelocity: number
}) {
  const isUser = message.role === 'user'
  const labelColor = isUser ? 'text-blue-600 bg-blue-50' : 'text-indigo-600 bg-indigo-50'
  const borderColor = isUser ? 'border-blue-200/40' : 'border-indigo-200/40'
  const Icon = isUser ? User : Robot
  const labelText = isUser ? '用户' : 'AI'

  const decorativeBubbles = useMemo(() => {
    const count = 4 + Math.floor(Math.random() * 5)
    return Array.from({ length: count }, (_, i): BubbleConfig => {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6
      const distance = 70 + Math.random() * 90
      return {
        size: 2 + Math.random() * 6,
        color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
        offsetX: Math.cos(angle) * distance,
        offsetY: Math.sin(angle) * distance,
        animationType: ANIMATION_TYPES[i % ANIMATION_TYPES.length],
        speed: 0.5 + Math.random() * 1.5,
        amplitude: 0.3 + Math.random() * 0.7,
        initialRotation: Math.random() * 360,
      }
    })
  }, [])

  return (
    <motion.div
      className="relative flex flex-col items-center py-4"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {decorativeBubbles.map((config, i) => (
        <DecorativeBubble
          key={i}
          config={config}
          scrollDirection={scrollDirection}
          scrollVelocity={scrollVelocity}
        />
      ))}

      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
        className={`relative bg-white rounded-2xl border ${borderColor} shadow-sm max-w-xl w-full mx-4`}
      >
        <div className="flex justify-center -mt-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${labelColor} shadow-sm`}
          >
            <Icon weight="fill" size={12} />
            {labelText}
          </span>
        </div>

        <div className="px-5 py-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </motion.div>
    </motion.div>
  )
}
