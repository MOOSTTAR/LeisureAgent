'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { LobbyCard } from './LobbyCard'
import { Sparkle, SlidersHorizontal } from '@phosphor-icons/react'

export function Lobby({ onAICardClick }: { onAICardClick?: (rect: DOMRect) => void }) {
  const [isImgHovered, setIsImgHovered] = useState(false)
  const aiCardRef = useRef<HTMLDivElement>(null)

  const handleManualPlanClick = () => {
    window.location.hash = '/manual-plan'
  }

  const handleAIPlanClick = () => {
    if (onAICardClick && aiCardRef.current) {
      const rect = aiCardRef.current.getBoundingClientRect()
      onAICardClick(rect)
    } else {
      window.location.hash = '/ai-plan'
    }
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50/50">
      {/* 顶部导航 */}
      <nav className="border-b border-slate-200/50 bg-white/80 backdrop-blur-sm sticky top-0 z-10 shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <img src="/logo.png" alt="LeisureAgent" className="h-12 w-auto" />
          </div>
        </div>
      </nav>

      {/* 主内容区域 */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center max-w-7xl mx-auto w-full px-6">

          {/* 标题 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-5 mb-8"
          >
            <motion.img
              src="/LeisureAgentI.png"
              alt=""
              className="h-32 w-auto shrink-0 cursor-pointer"
              onMouseEnter={() => setIsImgHovered(true)}
              onMouseLeave={() => setIsImgHovered(false)}
              animate={isImgHovered ? {
                scale: [1, 1.2, 1, 1.15, 1],
                rotate: [0, -10, 10, -8, 0],
                transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
              } : {
                scale: 1,
                rotate: 0,
                transition: { duration: 0.5, ease: 'easeOut' },
              }}
            />
            <h2 className="text-4xl md:text-6xl font-medium tracking-tighter text-slate-900">
              周末活动规划
              <br />
              <span className="text-slate-400">从未如此简单</span>
            </h2>
          </motion.div>

          {/* 分隔横线 */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="w-[480px] md:w-[600px] h-[1px] bg-slate-300 mb-6"
          />

          {/* 原文 */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-sm text-slate-500 text-center leading-relaxed mb-8"
          >
            告诉AI你的需求，或手动定制每个细节。
            <br />
            4-6 小时的精彩时光，一键生成完整方案
          </motion.p>

          {/* 卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
            {/* AI 列 */}
            <motion.div
              ref={aiCardRef}
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <LobbyCard
                type="ai"
                title="AI 一键规划"
                description="用自然语言描述你的需求，AI 智能体自动规划完整活动方案。"
                icon={<Sparkle weight="fill" size={32} />}
                onClick={handleAIPlanClick}
              />
            </motion.div>

            {/* 手动列 */}
            <motion.div
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <LobbyCard
                type="manual"
                title="手动规划"
                description="亲自挑选每个环节，灵活定制活动时间、地点和预算。"
                icon={<SlidersHorizontal weight="fill" size={32} />}
                onClick={handleManualPlanClick}
              />
            </motion.div>
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="border-t border-slate-200/50 bg-white/50 shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <p className="text-sm text-slate-500 text-center">
            © 2026 美团 AI Hackathon | THEGODOFAGENT · 冀国旭 · 付宇 · 龙轲垒
          </p>
        </div>
      </footer>

      {/* GitHub 链接 */}
      <motion.a
        href="https://github.com/MOOSTTAR/LeisureAgent"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        whileHover={{
          x: [0, -6, 6, -6, 6, -3, 3, 0],
          transition: { duration: 0.4, ease: 'easeInOut' },
        }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-3 px-7 py-4 bg-white rounded-xl border border-slate-200/50 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.15)] transition-shadow text-slate-600 hover:text-slate-900"
      >
        <div className="flex items-center gap-3 text-lg">
          <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span className="font-medium">GitHub</span>
        </div>
        <span className="text-base text-amber-500 font-medium">求个Star ⭐</span>
      </motion.a>
    </div>
  )
}
