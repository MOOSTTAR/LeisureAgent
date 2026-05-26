'use client'

import { useState, useEffect, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, CalendarBlank, Clock, MapPin, X, PersonSimpleWalk, Bicycle, Car, Train, Share } from '@phosphor-icons/react'
import { getTravelPlanById, getTravelPlanItems, resolveLocation, type TravelPlan, type TravelPlanItem, type ResolvedLocation } from '../api'
import { PlanMapView } from '../components/PlanMapView'
import { decodeShareCode } from '../utils/shareCode'

interface SharedPlanPageProps {
  shareCode: string
  onBack: () => void
}

const TRAVEL_TYPE_COLORS: Record<string, string> = {
  '亲子': 'bg-pink-50 text-pink-600 border-pink-200',
  '聚会': 'bg-blue-50 text-blue-600 border-blue-200',
  '单人出行': 'bg-emerald-50 text-emerald-600 border-emerald-200',
}

const TRAVEL_TYPE_ICONS: Record<string, string> = {
  '亲子': '👨‍👩‍👧',
  '聚会': '🎉',
  '单人出行': '🧘',
}

// Richer theme config with gradient stops
const THEME: Record<string, { gradient: string; badge: string; icon: string; accent: string; lightBg: string }> = {
  orange:   { gradient: 'from-orange-400 to-amber-500',    badge: 'bg-orange-50 text-orange-600 border-orange-200',    icon: '🍽️', accent: 'border-l-orange-400', lightBg: 'bg-orange-50/30' },
  emerald:  { gradient: 'from-emerald-400 to-teal-500',    badge: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: '🏞️', accent: 'border-l-emerald-400', lightBg: 'bg-emerald-50/30' },
  pink:     { gradient: 'from-pink-400 to-rose-500',       badge: 'bg-pink-50 text-pink-600 border-pink-200',          icon: '🛍️', accent: 'border-l-pink-400',    lightBg: 'bg-pink-50/30' },
  violet:   { gradient: 'from-violet-400 to-purple-500',   badge: 'bg-violet-50 text-violet-600 border-violet-200',    icon: '🏛️', accent: 'border-l-violet-400',  lightBg: 'bg-violet-50/30' },
  amber:    { gradient: 'from-amber-400 to-yellow-500',    badge: 'bg-amber-50 text-amber-600 border-amber-200',       icon: '🎢', accent: 'border-l-amber-400',   lightBg: 'bg-amber-50/30' },
}

export function SharedPlanPage({ shareCode, onBack }: SharedPlanPageProps) {
  const [plan, setPlan] = useState<TravelPlan | null>(null)
  const [items, setItems] = useState<TravelPlanItem[]>([])
  const [locations, setLocations] = useState<Map<number, ResolvedLocation | null>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)

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

  const groupedByDay = new Map<number, TravelPlanItem[]>()
  const timeToMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const sortedItems = [...items].sort((a, b) => timeToMin(a.arrive_time || '0:00') - timeToMin(b.arrive_time || '0:00'))
  for (const item of sortedItems) {
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
        className="flex flex-col h-[100dvh]"
        style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 50%, #fdf2f8 100%)' }}
      >
        {/* Header */}
        <nav className="shrink-0 bg-white/60 backdrop-blur-md border-b border-indigo-100/50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="p-2 rounded-xl hover:bg-white/80 transition-colors"
            >
              <ArrowLeft weight="bold" size={24} className="text-indigo-400" />
            </motion.button>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-200">
              <Share size={12} weight="fill" />
              分享
            </span>
            <h1 className="text-base font-semibold text-slate-700">查看计划</h1>
          </div>
        </nav>

        {/* Body */}
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          {isLoading ? (
            <div className="flex justify-center py-24">
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2.5 h-2.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm text-indigo-400">正在加载分享的计划...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-16 h-16 rounded-2xl bg-white/80 shadow-sm border border-slate-100 flex items-center justify-center mb-4">
                <X size={28} className="text-slate-300" />
              </div>
              <p className="text-slate-500 text-base">{error}</p>
              <button onClick={onBack} className="mt-4 px-5 py-2.5 bg-white/80 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-white hover:shadow-sm transition-all">
                返回首页
              </button>
            </div>
          ) : plan ? (
            <div className="max-w-4xl mx-auto px-4">
              {/* Hero Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm shadow-lg shadow-indigo-100/50 border border-white/80 my-6 p-6 md:p-8"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-100/50 via-violet-100/30 to-transparent rounded-bl-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-pink-100/30 to-transparent rounded-tr-full pointer-events-none" />

                <div className="relative">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-200">
                      <Share size={12} weight="fill" />
                      分享的计划
                    </span>
                    {plan.travel_type && (
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${TRAVEL_TYPE_COLORS[plan.travel_type] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        {TRAVEL_TYPE_ICONS[plan.travel_type] || ''} {plan.travel_type}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{plan.plan_title}</h2>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowMap(true)}
                      className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors text-indigo-500"
                      title="查看地图"
                    >
                      <MapPin size={20} weight="fill" />
                    </motion.button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-4 text-sm text-slate-500">
                    {plan.travel_date && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-slate-100 shadow-sm">
                        <CalendarBlank size={14} className="text-indigo-400" />
                        {plan.travel_date}
                      </span>
                    )}
                    <span className="px-3 py-1.5 rounded-xl bg-white/80 border border-slate-100 shadow-sm">共 {plan.travel_days} 天</span>
                    <span className="px-3 py-1.5 rounded-xl bg-white/80 border border-slate-100 shadow-sm">预算约 ¥{plan.total_cost}</span>
                    <span className="px-3 py-1.5 rounded-xl bg-white/80 border border-slate-100 shadow-sm">{plan.items?.length || sortedItems.length} 个行程</span>
                  </div>
                  {plan.plan_desc && (
                    <p className="text-sm text-slate-500 mt-5 leading-relaxed border-t border-slate-100 pt-5">{plan.plan_desc}</p>
                  )}
                </div>
              </motion.div>

              {/* Gallery Days */}
              {sortedDays.map((day, dayIdx) => (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: dayIdx * 0.1 }}
                  className="mb-8"
                >
                  {/* Day Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500" />
                    <h3 className="text-lg font-bold text-slate-800">
                      {day === 1 ? '🟣 周六' : day === 2 ? '🔵 周日' : `第 ${day} 天`}
                    </h3>
                    <span className="text-xs text-slate-400 font-medium ml-auto">
                      {groupedByDay.get(day)!.length} 站
                    </span>
                  </div>

                  {/* Gallery Cards */}
                  <div className="space-y-4">
                    {groupedByDay.get(day)!.map((item, idx) => {
                      const loc = locations.get(item.id)
                      const t = THEME[loc?.theme || 'orange']
                      const dayItems = groupedByDay.get(day)!
                      const hasNext = idx < dayItems.length - 1
                      const nextItem = hasNext ? dayItems[idx + 1] : null
                      const nextLoc = nextItem ? locations.get(nextItem.id) : null
                      const connectorDist = (loc && nextLoc)
                        ? Math.abs(loc.x - nextLoc.x) + Math.abs(loc.y - nextLoc.y)
                        : null

                      return (
                        <Fragment key={item.id}>
                          {/* Activity Card */}
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: idx * 0.08 }}
                            className={`relative bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm shadow-slate-100/50 overflow-hidden hover:shadow-md transition-shadow`}
                          >
                            {/* Color accent strip */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${t.gradient}`} />

                            <div className="p-5 md:p-6">
                              {/* Top row: step number + time + type badge */}
                              <div className="flex items-center gap-3 mb-3">
                                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-xs font-bold text-slate-500 shrink-0">
                                  {idx + 1}
                                </span>
                                {(item.arrive_time || item.leave_time) && (
                                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                    <Clock size={14} className="text-slate-400" />
                                    {item.arrive_time || '--'} — {item.leave_time || '--'}
                                  </div>
                                )}
                                {loc && (
                                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${t.badge}`}>
                                    {t.icon} {loc.typeLabel}
                                  </span>
                                )}
                                {item.stay_minute > 0 && (
                                  <span className="text-xs text-slate-400 ml-auto">停留 {item.stay_minute} 分钟</span>
                                )}
                              </div>

                              {/* Location name + address */}
                              {loc ? (
                                <>
                                  <h4 className="text-xl font-bold text-slate-800 mb-1.5">{loc.name}</h4>
                                  <div className="flex items-center gap-1.5 text-sm text-slate-400">
                                    <MapPin size={14} />
                                    <span>{loc.address}</span>
                                  </div>
                                  {loc.subtypeLabel && (
                                    <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-lg bg-slate-100 text-slate-500 border border-slate-200">
                                      {loc.subtypeLabel}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <div className="text-sm text-slate-400 py-2">加载中...</div>
                              )}

                              {item.remark && (
                                <div className={`mt-4 pt-4 border-t border-slate-100 rounded-lg ${t.lightBg} p-3 text-xs text-slate-500 leading-relaxed`}>
                                  💬 {item.remark}
                                </div>
                              )}

                              {/* Booking status */}
                              <div className="flex justify-end items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                                {item.is_need_booking === 1 ? (
                                  <>
                                    <span className="px-2.5 py-1 text-xs font-bold rounded-xl border bg-amber-50 text-amber-600 border-amber-200">
                                      需预约
                                    </span>
                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-xl border ${
                                      item.is_had_booking === 1
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                        : 'bg-slate-50 text-slate-400 border-slate-200'
                                    }`}>
                                      {item.is_had_booking === 1 ? '✓ 已预约' : '未预约'}
                                    </span>
                                  </>
                                ) : (
                                  <span className="px-2.5 py-1 text-xs font-bold rounded-xl border bg-slate-50 text-slate-400 border-slate-200">
                                    无需预约
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>

                          {/* Travel connector chip (read-only) */}
                          {hasNext && nextItem && (() => {
                            const modeLabels: Record<string, { label: string; Icon: typeof PersonSimpleWalk }> = {
                              walking: { label: '步行', Icon: PersonSimpleWalk },
                              biking: { label: '骑车', Icon: Bicycle },
                              driving: { label: '开车', Icon: Car },
                              subway: { label: '地铁', Icon: Train },
                            }
                            const mode = modeLabels[nextItem.travel_mode || 'walking']
                            const ModeIcon = mode.Icon
                            return (
                              <div className="flex justify-center -my-1 relative z-10">
                                <div className="bg-white/80 backdrop-blur-sm rounded-full border border-violet-100 px-4 py-1.5 flex items-center gap-2 shadow-sm">
                                  <span className="text-[10px] text-slate-400 font-medium">{loc?.name || ''}</span>
                                  <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm">
                                    <ModeIcon size={12} weight="fill" />
                                    {mode.label}
                                  </span>
                                  {connectorDist !== null && (
                                    <span className="text-[10px] text-slate-400">约 {connectorDist}m</span>
                                  )}
                                  <span className="text-[10px] text-slate-400 font-medium">{nextLoc?.name || ''}</span>
                                </div>
                              </div>
                            )
                          })()}
                        </Fragment>
                      )
                    })}
                  </div>
                </motion.div>
              ))}

              {sortedDays.length === 0 && (
                <div className="text-center py-24">
                  <div className="w-16 h-16 rounded-2xl bg-white/80 shadow-sm border border-slate-100 flex items-center justify-center mb-4 mx-auto">
                    <MapPin size={28} className="text-slate-300" />
                  </div>
                  <p className="text-slate-400">该计划暂无行程明细</p>
                </div>
              )}

              <div className="pb-8" />
            </div>
          ) : null}
        </div>

        {/* Map View */}
        <AnimatePresence>
          {showMap && (
            <PlanMapView
              points={sortedItems.map((item) => {
                const loc = locations.get(item.id)
                return {
                  name: loc?.name || '未知',
                  x: loc?.x || 0,
                  y: loc?.y || 0,
                  arriveTime: item.arrive_time || '',
                  leaveTime: item.leave_time || '',
                  theme: loc?.theme || 'orange',
                  typeLabel: loc?.typeLabel || '',
                  dayNum: item.day_num || 1,
                dayLabel: '',
                }
              })}
              onClose={() => setShowMap(false)}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}
