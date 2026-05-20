'use client'

import { motion } from 'framer-motion'
import { Sparkle, SlidersHorizontal, ArrowRight } from '@phosphor-icons/react'
import { useState } from 'react'

interface LobbyCardProps {
  type: 'ai' | 'manual'
  title: string
  description: string
  icon: React.ReactNode
  onClick?: () => void
}

export function LobbyCard({ type, title, description, icon, onClick }: LobbyCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        type: 'spring',
        stiffness: 100,
        damping: 20,
      }}
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 卡片容器 */}
      <motion.div
        className="relative h-full rounded-[2.5rem] bg-white border border-slate-200/50 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden cursor-pointer"
        whileHover={{
          scale: 1.02,
          transition: { duration: 0.3, type: 'spring', stiffness: 100, damping: 20 },
        }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
      >
        {/* 内容区域 */}
        <div className="p-10 md:p-12 h-full flex flex-col">
          {/* 图标区域 */}
          <div className="mb-8">
            <motion.div
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200/50 flex items-center justify-center text-emerald-600"
              animate={isHovered ? { rotate: [0, -5, 5, 0] } : {}}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              {icon}
            </motion.div>
          </div>

          {/* 标题 */}
          <h3 className="text-2xl md:text-3xl font-medium tracking-tight text-slate-900 mb-3">
            {title}
          </h3>

          {/* 描述 */}
          <p className="text-base text-slate-500 leading-relaxed mb-8">
            {description}
          </p>

          {/* 底部操作提示 */}
          <div className="mt-auto flex items-center gap-3 text-emerald-600 font-medium">
            <span className="text-sm">开始规划</span>
            <motion.div
              animate={isHovered ? { x: 4 } : { x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ArrowRight weight={600} size={20} />
            </motion.div>
          </div>
        </div>

        {/* 悬停时的装饰性光晕 */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: 'radial-gradient(600px circle at 50% 50%, rgba(16, 185, 129, 0.06), transparent 40%)',
          }}
        />
      </motion.div>
    </motion.div>
  )
}
