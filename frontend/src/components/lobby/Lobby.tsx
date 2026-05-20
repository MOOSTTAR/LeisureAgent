'use client'

import { motion } from 'framer-motion'
import { LobbyCard } from './LobbyCard'
import { Sparkle, SlidersHorizontal } from '@phosphor-icons/react'

export function Lobby() {
  const handleManualPlanClick = () => {
    // 页面跳转逻辑
    window.location.hash = '/manual-plan'
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50/50">
      {/* 顶部导航占位 */}
      <nav className="border-b border-slate-200/50 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-medium tracking-tight text-slate-900">
              LeisureAgent
            </h1>
          </div>
        </div>
      </nav>

      {/* 主内容区域 */}
      <main className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        {/* 标题区域 - 非对称布局 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16 md:mb-24"
        >
          <h2 className="text-4xl md:text-6xl font-medium tracking-tighter text-slate-900 mb-6">
            周末活动规划
            <br />
            <span className="text-slate-400">从未如此简单</span>
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed max-w-[65ch]">
            告诉 AI 你的需求，或手动定制每个细节。
            <br />
            4-6 小时的精彩时光，一键生成完整方案。
          </p>
        </motion.div>

        {/* 卡片网格 - 非对称 2 列布局 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
          <LobbyCard
            type="ai"
            title="AI 一键规划"
            description="用自然语言描述你的需求，AI 智能体自动规划完整活动方案，包括餐厅、活动和交通安排。"
            icon={<Sparkle weight="fill" size={32} />}
          />
          <LobbyCard
            type="manual"
            title="手动规划"
            description="亲自挑选每个环节，灵活定制活动时间、地点和预算，打造专属的个性化方案。"
            icon={<SlidersHorizontal weight="fill" size={32} />}
            onClick={handleManualPlanClick}
          />
        </div>
      </main>
    </div>
  )
}
