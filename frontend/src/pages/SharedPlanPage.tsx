'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, CalendarBlank, CaretRight, Clock, MapPin } from '@phosphor-icons/react'
import { toast } from '../components/Toast'
import { getTravelPlanById, getTravelPlanItems, confirmBooking, resolveLocation, type TravelPlan, type TravelPlanItem, type ResolvedLocation } from '../api'
import { decodeShareCode } from '../utils/shareCode'

interface SharedPlanPageProps {
  shareCode: string
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

export function SharedPlanPage({ shareCode, onBack }: SharedPlanPageProps) {
  const [plan, setPlan] = useState<TravelPlan | null>(null)
  const [items, setItems] = useState<TravelPlanItem[]>([])
  const [locations, setLocations] = useState<Map<number, ResolvedLocation | null>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmingItemId, setConfirmingItemId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const planId = decodeShareCode(shareCode)
        if (planId === null) {
          if (!cancelled) setError('无效的分享链接')
          return
        }
        const planRes = await getTravelPlanById(planId)
        if (!planRes.data) {
          if (!cancelled) setError('计划不存在或已被删除')
          return
        }
        if (!cancelled) setPlan(planRes.data)

        const itemsRes = await getTravelPlanItems({ plan_id: planId, page_size: 100 })
        const fetchedItems = itemsRes.data.list
        if (!cancelled) setItems(fetchedItems)

        const locMap = new Map<number, ResolvedLocation | null>()
        await Promise.all(
          fetchedItems.map(async (item: TravelPlanItem) => {
            try {
              locMap.set(item.id, await resolveLocation(item.location_table_name, item.location_id))
            } catch {
              locMap.set(item.id, null)
            }
          })
        )
        if (!cancelled) setLocations(locMap)
      } catch {
        if (!cancelled) setError('加载计划失败')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [shareCode])

  const handleConfirmBooking = async (itemId: number) => {
    setConfirmingItemId(itemId)
    try {
      const result = await confirmBooking(itemId)
      if (result.code === 0) {
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, is_had_booking: 1 } : i))
        toast.success('预约成功')
      } else {
        toast.error(result.msg || '预约失败，请重试')
      }
    } catch {
      toast.error('预约失败，请重试')
    } finally {
      setConfirmingItemId(null)
    }
  }

  const groupedByDay = new Map<number, TravelPlanItem[]>()
  for (const item of items) {
    const day = item.day_num || 1
    if (!groupedByDay.has(day)) groupedByDay.set(day, [])
    groupedByDay.get(day)!.push(item)
  }
  const sortedDays = Array.from(groupedByDay.keys()).sort((a, b) => a - b)

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="shared-plan"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col h-[100dvh] bg-slate-50/50"
      >
        {/* Header */}
        <nav className="border-b border-slate-200/50 bg-white/80 backdrop-blur-sm shrink-0">
          <div className="max-w-7xl mx-auto px-4 py-3">
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
                  分享的计划
                </h1>
              </div>
            </div>
          </div>
        </nav>

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
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-slate-400 text-lg">{error}</p>
              <button
                onClick={onBack}
                className="mt-4 px-4 py-2 bg-slate-100 rounded-xl text-sm text-slate-600 hover:bg-slate-200 transition-colors"
              >
                返回首页
              </button>
            </div>
          ) : plan ? (
            <div>
              {/* Plan info header */}
              <div className="bg-white border-b border-slate-100 px-4 py-5">
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">{plan.plan_title}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
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
                    <p className="text-sm text-slate-500 mt-2">{plan.plan_desc}</p>
                  )}
                </div>
              </div>

              {/* Timeline */}
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
                      {groupedByDay.get(day)!.map((item) => {
                        const loc = locations.get(item.id)
                        const theme = loc?.theme ? THEME_COLORS[loc.theme] : THEME_COLORS.orange

                        return (
                          <div key={item.id} className="relative mb-5 last:mb-0">
                            <div className={`absolute -left-[26px] top-3 w-3 h-3 rounded-full border-2 border-white ${theme.dot} z-10`} />

                            <motion.div
                              whileHover={{ y: -2 }}
                              className={`bg-white rounded-xl border ${theme.border} shadow-sm overflow-hidden`}
                            >
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
                                    <p className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                                      <MapPin size={12} />
                                      {loc.address}
                                    </p>
                                  </>
                                ) : (
                                  <div className="text-sm text-slate-400">加载中...</div>
                                )}
                                {item.remark && (
                                  <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">
                                    备注：{item.remark}
                                  </p>
                                )}
                                {item.is_need_booking === 1 && (
                                  <div className="flex justify-end mt-2 pt-2 border-t border-slate-100 items-center gap-2">
                                    {item.is_had_booking === 0 && (
                                      <button
                                        onClick={() => handleConfirmBooking(item.id)}
                                        disabled={confirmingItemId === item.id}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-500 text-white hover:bg-blue-600 active:scale-95 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                                      >
                                        {confirmingItemId === item.id ? '预约中...' : (<><CaretRight size={14} weight="fill" className="shrink-0" /> 预约</>)}
                                      </button>
                                    )}
                                    <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${
                                      item.is_had_booking === 1
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                        : 'bg-amber-50 text-amber-600 border border-amber-200'
                                    }`}>
                                      {item.is_had_booking === 1 ? '已预约' : '未预约'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {sortedDays.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-slate-400">该计划暂无行程明细</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
