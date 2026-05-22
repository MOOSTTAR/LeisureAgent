'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, User } from '@phosphor-icons/react'
import { CategoryCard } from '../components/category/CategoryCard'

interface ManualPlanPageProps {
  onBack: () => void
  onNavigate?: (page: string) => void
}

// 分类板块数据
const CATEGORIES = [
  { id: 'food', name: '美食', icon: '🍜', color: 'orange', description: '探索地道美食' },
  { id: 'outdoor', name: '户外', icon: '🏕️', color: 'green', description: '亲近大自然' },
  { id: 'exhibition', name: '观展', icon: '🎨', color: 'purple', description: '艺术与展览' },
  { id: 'shopping', name: '购物', icon: '🛍️', color: 'pink', description: '逛街购物' },
  { id: 'entertainment', name: '娱乐', icon: '🎪', color: 'yellow', description: '精彩娱乐项目' },
]

export function ManualPlanPage({ onBack, onNavigate }: ManualPlanPageProps) {
  const handleCategoryClick = (categoryId: string) => {
    if (categoryId === 'food') {
      window.location.hash = '/manual-plan/restaurant'
    } else if (categoryId === 'outdoor') {
      window.location.hash = '/manual-plan/park'
    } else if (categoryId === 'shopping') {
      window.location.hash = '/manual-plan/mall'
    } else if (categoryId === 'exhibition') {
      window.location.hash = '/manual-plan/exhibition'
    } else if (categoryId === 'entertainment') {
      window.location.hash = '/manual-plan/amusement'
    }
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50/50">
      {/* 顶部导航 */}
      <nav className="border-b border-slate-200/50 bg-white/80 backdrop-blur-sm sticky top-0 z-10 shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onBack}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft weight="bold" size={24} className="text-slate-600" />
              </motion.button>
              <h1 className="text-xl font-medium tracking-tight text-slate-900">
                手动规划
              </h1>
            </div>
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate?.('travel-plans')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700"
            >
              <User weight="bold" size={20} />
              <span className="text-sm font-medium">我的计划</span>
            </motion.button>
          </div>
        </div>
      </nav>

      {/* 主内容区域 - flex-1 让页脚推到底部 */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-slate-900 mb-4">
            选择活动类型
          </h2>
          <p className="text-base text-slate-500 leading-relaxed">
            挑选你感兴趣的活动类别，定制专属的周末方案
          </p>
        </motion.div>

        {/* 分类板块网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {CATEGORIES.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: index * 0.1,
                type: 'spring',
                stiffness: 100,
                damping: 20,
              }}
              onClick={() => handleCategoryClick(category.id)}
            >
              <CategoryCard
                name={category.name}
                icon={category.icon}
                color={category.color as any}
                description={category.description}
              />
            </motion.div>
          ))}
        </div>

        {/* 底部提示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-16 text-center">
          <p className="text-sm text-slate-400">
            更多分类即将上线
          </p>
        </motion.div>
      </main>

      {/* 页脚 */}
      <footer className="border-t border-slate-200/50 bg-white/50 shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <p className="text-sm text-slate-500 text-center">
            © 2026 美团 AI Hackathon | THEGODOFAGENT · 冀国旭 · 付宇 · 龙轲垒
          </p>
        </div>
      </footer>
    </div>
  )
}
