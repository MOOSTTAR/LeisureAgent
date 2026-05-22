'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, CalendarBlank, Clock, CaretLeft, CaretRight, Trash, MapPin } from '@phosphor-icons/react'
import { getTravelPlans, deleteTravelPlan, getTravelPlanItems, resolveLocation, type TravelPlan, type TravelPlanItem, type ResolvedLocation } from '../mock/api'

interface TravelPlanPageProps {
  onBack: () => void
}

const TRAVEL_TYPE_COLORS: Record<string, string> = {
  '亲子': 'bg-pink-50 text-pink-600',
  '聚会': 'bg-blue-50 text-blue-600',
  '单人出行': 'bg-emerald-50 text-emerald-600',
}

const TRAVEL_TYPE_ICONS: Record<string, string> = {
  '亲子': '👨‍👩‍👧',
  '聚会': '🎉',
  '单人出行': '🧘',
}

const THEME_COLORS: Record<ResolvedLocation['theme'], { bg: string; text: string; border: string; dot: string }> = {
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', dot: 'bg-orange-400' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-400' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200', dot: 'bg-pink-400' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', dot: 'bg-violet-400' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', dot: 'bg-amber-400' },
}

function TravelPlanCard({ plan, onDelete, onClick }: { plan: TravelPlan; onDelete: (id: number) => void; onClick: () => void }) {
  const typeColor = TRAVEL_TYPE_COLORS[plan.travel_type || ''] || 'bg-slate-50 text-slate-500'
  const typeIcon = TRAVEL_TYPE_ICONS[plan.travel_type || ''] || '📋'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-200/50 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)] overflow-hidden cursor-pointer hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)] transition-shadow group"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-slate-900 tracking-tight truncate">
              {plan.plan_title}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onDelete(plan.id) }}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              title="删除计划"
            >
              <Trash size={16} />
            </motion.button>
            {plan.travel_type && (
              <span className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap ${typeColor}`}>
                {typeIcon} {plan.travel_type}
              </span>
            )}
          </div>
        </div>

        {plan.plan_desc && (
          <p className="text-sm text-slate-500 mb-3 leading-relaxed">
            {plan.plan_desc}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-100">
          {plan.travel_date && (
            <span className="flex items-center gap-1">
              <CalendarBlank size={14} />
              {plan.travel_date}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock size={14} />
            创建于 {plan.created_at}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

interface PlanDetailProps {
  plan: TravelPlan
  onBack: () => void
}

function PlanDetail({ plan, onBack }: PlanDetailProps) {
  const [items, setItems] = useState<TravelPlanItem[]>([])
  const [locations, setLocations] = useState<Map<number, ResolvedLocation | null>>(new Map())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true)
      try {
        const res = await getTravelPlanItems({ plan_id: plan.id })
        const fetchedItems = res.data.list
        setItems(fetchedItems)

        const locMap = new Map<number, ResolvedLocation | null>()
        for (const item of fetchedItems) {
          locMap.set(item.id, resolveLocation(item.location_table_name, item.location_id))
        }
        setLocations(locMap)
      } catch (error) {
        console.error('Failed to fetch plan items:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDetail()
  }, [plan.id])

  // Group items by day_num
  const groupedByDay = new Map<number, TravelPlanItem[]>()
  for (const item of items) {
    const day = item.day_num || 1
    if (!groupedByDay.has(day)) groupedByDay.set(day, [])
    groupedByDay.get(day)!.push(item)
  }
  const sortedDays = Array.from(groupedByDay.keys()).sort((a, b) => a - b)

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="shrink-0 bg-white/80 backdrop-blur-sm border-b border-slate-200/50 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft weight="bold" size={24} className="text-slate-600" />
            </motion.button>
            <h1 className="text-lg font-medium text-slate-900 tracking-tight">{plan.plan_title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 ml-11">
            {plan.travel_date && (
              <span className="flex items-center gap-1">
                <CalendarBlank size={14} />
                {plan.travel_date}
              </span>
            )}
            {plan.travel_type && (
              <span className={`px-2 py-0.5 rounded-md font-medium ${TRAVEL_TYPE_COLORS[plan.travel_type] || 'bg-slate-50 text-slate-500'}`}>
                {TRAVEL_TYPE_ICONS[plan.travel_type] || ''} {plan.travel_type}
              </span>
            )}
            <span>共 {plan.travel_days} 天</span>
            <span>预算约 ¥{plan.total_cost}</span>
          </div>
          {plan.plan_desc && (
            <p className="text-sm text-slate-500 mt-2 ml-11">{plan.plan_desc}</p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="flex items-center gap-2 text-slate-500">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-sm ml-2">加载中...</span>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6">
            {sortedDays.map((day) => (
              <div key={day} className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-blue-500 text-white text-sm font-medium rounded-lg">
                    第 {day} 天
                  </span>
                  <span className="text-xs text-slate-400">
                    {groupedByDay.get(day)!.length} 个行程
                  </span>
                </div>

                <div className="relative pl-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {groupedByDay.get(day)!.map((item, idx) => {
                    const loc = locations.get(item.id)
                    const theme = loc?.theme ? THEME_COLORS[loc.theme] : THEME_COLORS.orange

                    return (
                      <div key={item.id} className="relative mb-5 last:mb-0">
                        {/* Timeline dot */}
                        <div className={`absolute -left-[26px] top-3 w-3 h-3 rounded-full border-2 border-white ${theme.dot} z-10`} />

                        {/* Card */}
                        <div className={`bg-white rounded-xl border ${theme.border} shadow-sm overflow-hidden`}>
                          {/* Time bar */}
                          {(item.arrive_time || item.leave_time) && (
                            <div className={`flex items-center gap-3 px-4 py-2.5 ${theme.bg} border-b ${theme.border}`}>
                              <Clock size={14} className={theme.text} />
                              <span className={`text-sm font-medium ${theme.text}`}>
                                {item.arrive_time || '--'} — {item.leave_time || '--'}
                              </span>
                              {item.stay_minute > 0 && (
                                <span className={`text-xs ${theme.text} opacity-70`}>
                                  停留 {item.stay_minute} 分钟
                                </span>
                              )}
                            </div>
                          )}

                          <div className="p-4">
                            {loc ? (
                              <>
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${theme.bg} ${theme.text}`}>
                                        {loc.typeLabel}
                                      </span>
                                      {loc.subtypeLabel && (
                                        <span className="px-2 py-0.5 text-xs rounded-md bg-slate-100 text-slate-500">
                                          {loc.subtypeLabel}
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="text-base font-medium text-slate-900">{loc.name}</h4>
                                  </div>
                                </div>
                                <p className="flex items-center gap-1 text-xs text-slate-400 mb-2">
                                  <MapPin size={12} />
                                  {loc.address}
                                </p>
                              </>
                            ) : (
                              <div className="text-sm text-slate-400">
                                场所信息加载中...
                              </div>
                            )}

                            {item.remark && (
                              <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100 leading-relaxed">
                                {item.remark}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {items.length === 0 && (
              <div className="text-center py-16">
                <p className="text-slate-400 text-lg">暂无行程明细</p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function TravelPlanPage({ onBack }: TravelPlanPageProps) {
  const [plans, setPlans] = useState<TravelPlan[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isFetching, setIsFetching] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<TravelPlan | null>(null)
  const [pageSize, setPageSize] = useState(5)

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      const result = await deleteTravelPlan(id)
      if (result.code === 0) {
        setPlans(prev => prev.filter(p => p.id !== id))
        setTotal(prev => prev - 1)
      }
    } catch (error) {
      console.error('Failed to delete travel plan:', error)
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    const fetchPlans = async () => {
      setIsFetching(true)
      try {
        const response = await getTravelPlans({ page, page_size: pageSize })
        setPlans(response.data.list)
        setTotal(response.data.total)
      } catch (error) {
        console.error('Failed to fetch travel plans:', error)
      } finally {
        setIsFetching(false)
      }
    }
    fetchPlans()
  }, [page, pageSize])

  useEffect(() => {
    setPage(1)
  }, [pageSize])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50/50">
      <AnimatePresence mode="wait">
        {selectedPlan ? (
          <PlanDetail
            key={`detail-${selectedPlan.id}`}
            plan={selectedPlan}
            onBack={() => setSelectedPlan(null)}
          />
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col h-full"
          >
            <nav className="border-b border-slate-200/50 bg-white/80 backdrop-blur-sm shrink-0">
              <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
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
                    <div>
                      <h1 className="text-lg font-medium tracking-tight text-slate-900">
                        我的计划
                      </h1>
                      <p className="text-xs text-slate-500">
                        共 {total} 个方案
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </nav>

            <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
              {isFetching ? (
                <div className="flex justify-center py-16">
                  <div className="flex items-center gap-2 text-slate-500">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-sm ml-2">加载中...</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="max-w-3xl mx-auto w-full px-4 py-4 space-y-4">
                    {plans.map((plan) => (
                      <div key={plan.id} className={`relative ${deletingId === plan.id ? 'pointer-events-none opacity-50' : ''}`}>
                        <TravelPlanCard plan={plan} onDelete={handleDelete} onClick={() => setSelectedPlan(plan)} />
                        {deletingId === plan.id && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm text-slate-400">删除中...</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {total === 0 && (
                    <div className="text-center py-16">
                      <p className="text-slate-400 text-lg">暂无计划</p>
                      <p className="text-slate-400 text-sm mt-2">去手动规划创建一个吧</p>
                    </div>
                  )}

                  {total > 0 && (
                    <div className="flex items-center justify-between py-6 px-4 max-w-3xl mx-auto">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>每页</span>
                        {([5, 10] as const).map((size) => (
                          <button
                            key={size}
                            onClick={() => setPageSize(size)}
                            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                              pageSize === size
                                ? 'bg-blue-500 text-white'
                                : 'text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                        <span>条</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          disabled={page <= 1}
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          className={`p-2 rounded-xl transition-colors ${
                            page <= 1
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <CaretLeft size={20} weight="bold" />
                        </motion.button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                          <motion.button
                            key={p}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setPage(p)}
                            className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                              p === page
                                ? 'bg-blue-500 text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {p}
                          </motion.button>
                        ))}

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          disabled={page >= totalPages}
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          className={`p-2 rounded-xl transition-colors ${
                            page >= totalPages
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <CaretRight size={20} weight="bold" />
                        </motion.button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
