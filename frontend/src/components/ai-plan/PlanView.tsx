import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Clock, MapPin, CheckCircle, XCircle, Warning, Info, Share } from '@phosphor-icons/react'
import {
  ACTIVITY_TYPE_LABELS,
  TRAVEL_MODE_LABELS,
  TRAVEL_MODE_ICONS,
  TABLE_TYPE_INFO,
  calcDist,
  estTravelMins,
} from './constants'
import type { AgentPlan, AgentPlanItem, ExecuteResult, ExceptionEvent, ResolvedLocation } from '../../api'

export function PlanView({
  plan,
  executeResults,
  executing,
  exceptions,
  warnings,
  resolvedLocations,
  dayCount,
  travelModeConfirmed,
  onExecute,
  onRegenerate,
  onOther,
  onShowMap,
  onShowTravelMode,
  onShare,
}: {
  plan: AgentPlan
  executeResults: ExecuteResult[] | null
  executing: boolean
  exceptions: ExceptionEvent | null
  warnings: string[]
  resolvedLocations: Map<number, ResolvedLocation | null>
  dayCount: number
  travelModeConfirmed: boolean
  onExecute: () => void
  onRegenerate: () => void
  onOther: (feedback: string) => void
  onShowMap: () => void
  onShowTravelMode: () => void
  onShare: () => void
}) {
  const [otherText, setOtherText] = useState('')
  const days = useMemo(() => {
    const map = new Map<string, { key: number; label: string; items: AgentPlanItem[] }>()
    for (const item of plan.items) {
      const label = item.day_label || `第${item.day_num || 1}天`
      if (!map.has(label)) map.set(label, { key: item.day_num || 1, label, items: [] })
      map.get(label)!.items.push(item)
    }
    return [...map.values()].sort((a, b) => a.key - b.key)
  }, [plan.items])
  const isMultiDay = days.length > 1

  const allResults = plan.items.map((item) => {
    if (!executeResults) return null
    return executeResults.find(
      (r) => r.location_table_name === item.location_table_name && r.location_id === item.location_id,
    ) ?? null
  })

  const hasExecuted = executeResults !== null && executeResults.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="px-4 py-6"
    >
      <div className="max-w-xl mx-auto">
        {/* Plan Header */}
        <div className="bg-white rounded-2xl border border-emerald-200/50 shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-slate-900">{plan.title}</h3>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onShowMap}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-emerald-600"
              title="查看地图"
            >
              <MapPin size={18} weight="fill" />
            </motion.button>
            {plan.id != null && hasExecuted && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onShare}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-blue-500"
                title="分享计划"
              >
                <Share size={18} weight="fill" />
              </motion.button>
            )}
          </div>
          {plan.description && (
            <p className="text-sm text-slate-500 mb-3">{plan.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 font-medium">
              {plan.travel_type}
            </span>
            {isMultiDay ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-600 font-semibold border border-indigo-200">
                {days.map((d) => d.label).join(' + ')} · {days.length} 天行程
              </span>
            ) : dayCount > 1 ? (
              <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-600 font-semibold border border-amber-200">
                {dayCount} 天行程
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-200">
                单日行程
              </span>
            )}
            <span>预估费用 <span className="text-slate-900 font-medium">¥{plan.total_cost}</span></span>
            <span>共 {plan.items.length} 个行程</span>
          </div>
        </div>

        {/* Timeline — grouped by day */}
        <div className="space-y-6">
          {days.map(({ key, label, items: dayItems }) => (
            <div key={key}>
              {isMultiDay && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-600">
                    {label}
                  </span>
                  <div className="flex-1 h-px bg-indigo-100" />
                </div>
              )}
              <div className="relative pl-8">
                {/* 起点（家） */}
                <div className="relative mb-1">
                  <div className="absolute -left-[26px] top-1.5 w-3 h-3 rounded-full border-2 border-white bg-slate-400 z-10" />
                  <div className="flex items-center gap-2 pl-1 py-1">
                    <span className="text-sm font-medium text-slate-500">起点（家）</span>
                  </div>
                </div>

                {/* 连接线 */}
                <div className="absolute left-[11px] top-3 bottom-0 w-0.5 bg-slate-200" />

                {dayItems.map((item) => {
                  const globalIdx = plan.items.indexOf(item)
                  const info = TABLE_TYPE_INFO[item.location_table_name] ?? TABLE_TYPE_INFO.restaurant
                  const activityLabel = ACTIVITY_TYPE_LABELS[item.activity_type] || item.activity_type

                  const prevItem = globalIdx > 0 ? plan.items[globalIdx - 1] : null
                  const fromX = prevItem?.location_x ?? 0
                  const fromY = prevItem?.location_y ?? 0
                  const toX = item.location_x || 0
                  const toY = item.location_y || 0
                  const dist = calcDist(fromX, fromY, toX, toY)
                  const mode = item.travel_mode || 'walking'
                  const travelMins = estTravelMins(dist, mode)

                  return (
                    <div key={globalIdx} className="relative">
                      {/* 出行方式连接段 */}
                      <div className="flex items-center gap-3 py-2 pl-1">
                        <div className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                        <span className="text-xs text-slate-400">
                          {TRAVEL_MODE_ICONS[mode] || '🚶'} {TRAVEL_MODE_LABELS[mode] || '步行'}
                          {travelMins > 0 && <> · 约{travelMins}分钟</>}
                          {dist > 0 && <> · {dist >= 1000 ? `${(dist / 1000).toFixed(1)}km` : `约${dist}m`}</>}
                        </span>
                      </div>

                      {/* 地点卡片 */}
                      <div className="relative mb-1">
                        <div className={`absolute -left-[26px] top-3 w-3 h-3 rounded-full border-2 border-white ${info.dot} z-10`} />

                        <div className={`bg-white rounded-xl border ${info.theme.split(' ')[2]} shadow-sm overflow-hidden`}>
                          {(item.arrive_time || item.leave_time) && (
                            <div className={`flex items-center gap-3 px-4 py-2.5 ${info.theme.split(' ')[0]} border-b ${info.theme.split(' ')[2]}`}>
                              <Clock size={14} className={info.theme.split(' ')[1]} />
                              <span className={`text-sm font-medium ${info.theme.split(' ')[1]}`}>
                                {item.arrive_time || '--'} — {item.leave_time || '--'}
                              </span>
                              {item.stay_minute > 0 && (
                                <span className={`text-xs ${info.theme.split(' ')[1]} opacity-70`}>
                                  停留 {item.stay_minute} 分钟
                                </span>
                              )}
                            </div>
                          )}

                          <div className="p-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${info.theme.split(' ')[0]} ${info.theme.split(' ')[1]}`}>
                                {info.typeLabel}
                              </span>
                              <span className="px-2 py-0.5 text-xs rounded-md bg-slate-100 text-slate-500">
                                {activityLabel}
                              </span>
                              {item.estimated_cost > 0 && (
                                <span className="text-xs text-slate-400">¥{item.estimated_cost}</span>
                              )}
                            </div>
                            <h4 className="text-base font-medium text-slate-900">{item.location_name}</h4>
                            <p className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                              <MapPin size={12} />
                              {item.address}
                            </p>
                            {item.remark && (
                              <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">
                                {item.remark}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Execution result badge */}
                        {hasExecuted && allResults[globalIdx] && (
                          <div className={`mt-1 ml-1 flex items-center gap-1 text-xs ${
                            allResults[globalIdx]!.status === 'success' ? 'text-emerald-600' : 'text-red-500'
                          }`}>
                            {allResults[globalIdx]!.status === 'success'
                              ? <CheckCircle size={12} weight="fill" />
                              : <XCircle size={12} weight="fill" />
                            }
                            {allResults[globalIdx]!.message}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Exceptions & Warnings */}
        {exceptions && (exceptions.exceptions.length > 0 || warnings.length > 0) && (
          <div className="mt-4 space-y-2">
            {exceptions.exceptions.map((e, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <Warning size={14} className="shrink-0 mt-0.5" weight="fill" />
                <span>{e.detail}</span>
              </div>
            ))}
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                <Info size={14} className="shrink-0 mt-0.5" weight="fill" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        {!hasExecuted && (
          <div className="mt-6 space-y-3">
            {!travelModeConfirmed ? (
              <>
                <button
                  onClick={onShowTravelMode}
                  className="w-full py-2.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 active:scale-[0.98] shadow-sm transition-all"
                >
                  选择出行方式
                </button>
                <p className="text-xs text-slate-400 text-center">
                  先选择地点间的出行方式，确认时间后再执行预约
                </p>
              </>
            ) : (
              <>
                <button
                  onClick={onExecute}
                  disabled={executing}
                  className="w-full py-2.5 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 active:scale-[0.98] shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {executing ? '正在执行预约...' : '确认方案，执行预约 (Yes)'}
                </button>
                <button
                  onClick={onRegenerate}
                  disabled={executing}
                  className="w-full py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-200 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  不要这个方案 (No)
                </button>
                <div className="flex items-center gap-2">
                  <input
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    placeholder="Other — 输入其他想法或修改意见..."
                    disabled={executing}
                    className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-300 focus:bg-white transition-colors disabled:opacity-50 placeholder:text-slate-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && otherText.trim()) {
                        onOther(otherText.trim())
                        setOtherText('')
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (otherText.trim()) {
                        onOther(otherText.trim())
                        setOtherText('')
                      }
                    }}
                    disabled={executing || !otherText.trim()}
                    className="shrink-0 px-4 py-2.5 bg-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-300 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    提交
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Execution Summary */}
        {hasExecuted && (
          <div className="mt-6 bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-700">
              {executeResults.every((r) => r.status === 'success') ? '全部预约成功' : '部分预约失败'}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
