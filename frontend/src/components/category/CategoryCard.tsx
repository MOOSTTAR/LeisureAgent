'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

// 颜色映射表
const COLOR_MAP = {
  orange: {
    bg: 'from-orange-50 to-orange-100',
    border: 'border-orange-200/50',
    text: 'text-orange-600',
    hoverBg: 'group-hover:from-orange-100',
  },
  green: {
    bg: 'from-green-50 to-green-100',
    border: 'border-green-200/50',
    text: 'text-green-600',
    hoverBg: 'group-hover:from-green-100',
  },
  purple: {
    bg: 'from-purple-50 to-purple-100',
    border: 'border-purple-200/50',
    text: 'text-purple-600',
    hoverBg: 'group-hover:from-purple-100',
  },
  blue: {
    bg: 'from-blue-50 to-blue-100',
    border: 'border-blue-200/50',
    text: 'text-blue-600',
    hoverBg: 'group-hover:from-blue-100',
  },
  pink: {
    bg: 'from-pink-50 to-pink-100',
    border: 'border-pink-200/50',
    text: 'text-pink-600',
    hoverBg: 'group-hover:from-pink-100',
  },
  yellow: {
    bg: 'from-yellow-50 to-yellow-100',
    border: 'border-yellow-200/50',
    text: 'text-yellow-600',
    hoverBg: 'group-hover:from-yellow-100',
  },
  red: {
    bg: 'from-red-50 to-red-100',
    border: 'border-red-200/50',
    text: 'text-red-600',
    hoverBg: 'group-hover:from-red-100',
  },
}

interface CategoryCardProps {
  name: string
  icon: string
  color: keyof typeof COLOR_MAP
  description: string
}

export function CategoryCard({ name, icon, color, description }: CategoryCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const colors = COLOR_MAP[color]

  return (
    <motion.div
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 卡片容器 */}
      <motion.div
        className={`relative rounded-3xl bg-white border ${colors.border} shadow-[0_8px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden cursor-pointer`}
        whileHover={{
          y: -4,
          scale: 1.02,
          transition: { duration: 0.3, type: 'spring', stiffness: 100, damping: 20 },
        }}
        whileTap={{ scale: 0.98 }}
      >
        {/* 内容区域 */}
        <div className="p-6 h-full flex flex-col">
          {/* 图标区域 */}
          <motion.div
            className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors.bg} ${colors.border} border flex items-center justify-center text-2xl mb-4`}
            animate={isHovered ? { scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] } : {}}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            {icon}
          </motion.div>

          {/* 名称 */}
          <h3 className="text-xl font-medium tracking-tight text-slate-900 mb-2">
            {name}
          </h3>

          {/* 描述 */}
          <p className="text-sm text-slate-500 leading-relaxed">
            {description}
          </p>

          {/* 底部装饰线 */}
          <motion.div
            className={`mt-4 h-1 rounded-full bg-gradient-to-r ${colors.bg} opacity-0`}
            animate={isHovered ? { opacity: 1, width: '100%' } : { opacity: 0, width: '0%' }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* 悬停时的光晕效果 */}
        <motion.div
          className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
          style={{
            background: `radial-gradient(400px circle at 50% 50%, rgba(255,255,255,0.8), transparent 70%)`,
          }}
        />
      </motion.div>
    </motion.div>
  )
}
