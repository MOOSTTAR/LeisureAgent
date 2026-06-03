import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CaretLeft,
  CaretRight,
  Plus,
  Trash,
  User,
  Robot,
  PaperPlaneTilt,
  ArrowLeft,
  Clock,
  MapPin,
  Spinner,
  CheckCircle,
  XCircle,
  Warning,
  Info,
  Share,
} from '@phosphor-icons/react'
import { toast } from '../components/Toast'
import {
  getAgentSessions,
  getAgentSession,
  deleteAgentSession,
  chatStream,
  resolveLocation,
  type AgentSession,
  type AgentMessage,
  type AgentPlan,
  type AgentPlanItem,
  type ResolvedLocation,
  type TokenEvent,
  updateTravelModes,
  type ExecuteResult,
  type InquiryEvent,
  type ExceptionEvent,
  type StageEvent,
  type StepEvent,
} from '../api'
import { TravelModeSelector } from '../components/TravelModeSelector'
import { PlanMapView } from '../components/PlanMapView'
import { ShareModal } from '../components/ShareModal'
import { encodePlanId } from '../utils/shareCode'

// ==================== Types ====================

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type AnimationType = 'scale' | 'translate' | 'count' | 'irregular'

interface BubbleConfig {
  size: number
  color: string
  offsetX: number
  offsetY: number
  animationType: AnimationType
  speed: number
  amplitude: number
  initialRotation: number
}

// ==================== Constants ====================

const BUBBLE_COLORS = [
  'bg-blue-300/30',
  'bg-blue-300/20',
  'bg-indigo-300/30',
  'bg-indigo-300/20',
  'bg-sky-300/30',
  'bg-sky-300/20',
  'bg-purple-300/25',
  'bg-violet-300/25',
]

const ANIMATION_TYPES: AnimationType[] = ['scale', 'translate', 'count', 'irregular']

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  play: '游玩',
  dining: '用餐',
  shopping: '购物',
  buffer: '休息',
}

const TRAVEL_MODE_LABELS: Record<string, string> = {
  walking: '步行',
  biking: '骑车',
  driving: '开车',
  subway: '地铁',
}

const TRAVEL_MODE_ICONS: Record<string, string> = {
  walking: '🚶',
  biking: '🚴',
  driving: '🚗',
  subway: '🚇',
}

const TRAVEL_SPEEDS: Record<string, number> = {
  walking: 80, biking: 250, driving: 500, subway: 600,
}

function calcDist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2)
}

function estTravelMins(dist: number, mode: string): number {
  if (!mode || !TRAVEL_SPEEDS[mode]) return 0
  let mins = dist / TRAVEL_SPEEDS[mode]
  if (mode === 'subway') mins += 10
  return Math.max(1, Math.round(mins))
}

const TABLE_TYPE_INFO: Record<string, { typeLabel: string; theme: string; dot: string }> = {
  restaurant: { typeLabel: '餐厅', theme: 'bg-orange-50 text-orange-600 border-orange-200', dot: 'bg-orange-400' },
  scenic_spot: { typeLabel: '景点', theme: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-400' },
  mall: { typeLabel: '商场', theme: 'bg-pink-50 text-pink-600 border-pink-200', dot: 'bg-pink-400' },
  exhibition_hall: { typeLabel: '展馆', theme: 'bg-violet-50 text-violet-600 border-violet-200', dot: 'bg-violet-400' },
  amusement_park: { typeLabel: '乐园', theme: 'bg-amber-50 text-amber-600 border-amber-200', dot: 'bg-amber-400' },
}

const NODE_LABELS: Record<string, string> = {
  load_session: '正在加载会话数据...',
  classify_intent: '正在分类意图（Agent）...',
  analyze_goal: '正在解析出行需求（Agent 提取场景/偏好/天数）...',
  search_candidates: '正在搜索候选地点...',
  search_inquiry: '正在搜索...',
  detect_exceptions: '正在检查地点可用性...',
  adjust_search: '正在扩大搜索范围...',
  compose_plan: 'Agent 正在编排行程方案...',
  persist_plan: '正在保存方案到数据库...',
  present_plan: '正在整理方案...',
  present_inquiry: '正在整理搜索结果...',
  analyze_feedback: '正在理解修改意见（Agent）...',
  execute_bookings: '正在执行预约...',
  replan_execute: '正在重新规划替代方案...',
  finalize: '正在生成分享文案...',
  finalize_executed: '预约完成',
}

// 每个节点独立为一个步骤，不再跨节点合并阶段
// 快速步骤（< 0.5s）会被吸收到下一步的标签中
const NODE_PHASES: Record<string, string> = {
  load_session: 'load',
  classify_intent: 'classify',
  analyze_goal: 'analyze',
  search_candidates: 'search',
  search_inquiry: 'search',
  detect_exceptions: 'detect',
  adjust_search: 'adjust',
  compose_plan: 'compose',
  persist_plan: 'persist',
  present_plan: 'present',
  present_inquiry: 'present',
  analyze_feedback: 'feedback',
  execute_bookings: 'execute',
  replan_execute: 'execute',
  finalize: 'finalize',
  finalize_executed: 'finalize',
  direct_reply: 'reply',
}

// ==================== ErrorBoundary ====================

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; errorMsg: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, errorMsg: '' }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PlanView render error:', error.message, error.stack, errorInfo.componentStack)
    this.setState({ errorMsg: error.message })
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-2">
          <span className="text-sm text-slate-400">页面渲染出错，请刷新重试</span>
          {this.state.errorMsg && (
            <span className="text-xs text-slate-300 max-w-md text-center break-all">{this.state.errorMsg}</span>
          )}
        </div>
      )
    }
    return this.props.children
  }
}

// ==================== DecorativeBubble ====================

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

// ==================== MessageBubble ====================

function MessageBubble({
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

// ==================== InquiryModal ====================

function InquiryModal({
  data,
  onClose,
  onAddToPlan,
  onOther,
}: {
  data: InquiryEvent
  onClose: () => void
  onAddToPlan: (itemNames: string[]) => void
  onOther: (feedback: string) => void
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [otherText, setOtherText] = useState('')

  const toggleItem = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAddSelected = () => {
    const names = data.items.filter((item) => selected.has(item.id)).map((item) => item.name)
    if (names.length > 0) onAddToPlan(names)
  }

  const handleAddAll = () => {
    onAddToPlan(data.items.map((item) => item.name))
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <motion.div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-w-lg w-full mx-0 sm:mx-4 max-h-[70vh] overflow-hidden flex flex-col"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">查询结果</h3>
          <p className="text-xs text-slate-500 mt-0.5">{data.message}</p>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {data.items.map((item) => {
            const isSelected = selected.has(item.id)
            return (
              <div
                key={`${item.category}-${item.id}`}
                onClick={() => toggleItem(item.id)}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  isSelected ? 'border-blue-300 bg-blue-50' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                }`}>
                  {isSelected && <CheckCircle size={14} weight="fill" className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 truncate">{item.name}</span>
                    {!item.available && (
                      <span className="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded">已满</span>
                    )}
                    {item.can_book && item.available && (
                      <span className="text-xs text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded">可预约</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {item.address} · {item.distance}m
                    {item.queue_time && item.queue_time > 0 ? ` · 排队约${item.queue_time}分钟` : ''}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Actions — Yes/No/Other */}
        <div className="px-5 py-3 border-t border-slate-100 space-y-2">
          <button
            onClick={selected.size > 0 ? handleAddSelected : handleAddAll}
            className="w-full py-2.5 text-sm font-semibold text-white bg-blue-500 rounded-xl hover:bg-blue-600 active:scale-[0.98] transition-all"
          >
            {selected.size > 0 ? `添加选中 (${selected.size})` : '全部添加'} (Yes)
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 text-sm text-slate-500 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
          >
            不要了 (No)
          </button>
          <div className="flex items-center gap-2">
            <input
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="Other — 输入其他需求..."
              className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-300 focus:bg-white transition-colors placeholder:text-slate-400"
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
              disabled={!otherText.trim()}
              className="shrink-0 px-4 py-2 bg-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              提交
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ==================== PlanView ====================

function PlanView({
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

                  // 计算从上一地点到当前地点的距离和出行时间
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

// ==================== ProcessingRecord ====================

function ProcessingRecord({
  streamSteps,
  isStreaming,
}: {
  streamSteps: { label: string; status: 'active' | 'completed'; elapsed?: number }[]
  isStreaming: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center py-6 gap-3"
    >
      <div className="flex flex-col gap-1.5 px-4 py-3 bg-white rounded-2xl border border-indigo-200/40 shadow-sm min-w-[260px]">
        <div className="flex items-center gap-2 mb-1">
          {isStreaming ? (
            <Spinner size={14} className="text-indigo-500 animate-spin" />
          ) : (
            <CheckCircle size={14} weight="fill" className="text-emerald-400" />
          )}
          <span className="text-xs text-slate-400 font-medium">
            {isStreaming ? 'Agent 正在处理...' : '处理记录'}
          </span>
        </div>
        {streamSteps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex items-center gap-2 text-xs ${
              step.status === 'completed' ? 'text-slate-400' : 'text-slate-700 font-medium'
            }`}
          >
            {step.status === 'completed' ? (
              <CheckCircle size={12} weight="fill" className="text-emerald-400 shrink-0" />
            ) : (
              <Spinner size={12} className="text-indigo-500 animate-spin shrink-0" />
            )}
            <span className="flex-1">{step.label}</span>
            {step.elapsed != null && (
              <span className="text-[10px] text-slate-300 tabular-nums">{step.elapsed}s</span>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

// ==================== ChatArea ====================

function ChatArea({
  messages,
  currentPlan,
  executeResults,
  isStreaming,
  stepHistory,
  activeUserMsgIdx,
  executing,
  entranceReady,
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
  messages: ChatMessage[]
  currentPlan: AgentPlan | null
  executeResults: ExecuteResult[] | null
  isStreaming: boolean
  stepHistory: Map<number, { label: string; status: 'active' | 'completed'; elapsed?: number }[]>
  activeUserMsgIdx: number
  executing: boolean
  entranceReady: boolean
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
  const containerRef = useRef<HTMLDivElement>(null)
  const prevScrollTopRef = useRef(0)
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null)
  const [scrollVelocity, setScrollVelocity] = useState(0)

  const charConfigs = useMemo(() => {
    const text = '来与LeisureAgent设计一场周末出行吧~'
    return [...text].map(() => {
      const startX = -(300 + Math.random() * 400)
      const startY = -(60 + Math.random() * 80)
      const startRotate = (Math.random() - 0.5) * 55
      return {
        startX,
        startY,
        startRotate,
        stiffnessX: 45 + Math.random() * 25,
        dampingX: 10 + Math.random() * 5,
        stiffnessY: 15 + Math.random() * 15,
        dampingY: 3 + Math.random() * 3,
        stiffnessR: 25 + Math.random() * 20,
        dampingR: 6 + Math.random() * 4,
      }
    })
  }, [])

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isStreaming, currentPlan, scrollToBottom])

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const currentScrollTop = el.scrollTop
    const delta = currentScrollTop - prevScrollTopRef.current
    const maxScroll = el.scrollHeight - el.clientHeight

    if (Math.abs(delta) > 0.5) {
      const direction = delta > 0 ? 'down' : 'up'
      const velocity = Math.min(Math.abs(delta) / 50, 1)
      setScrollDirection(direction)
      setScrollVelocity(velocity)
    }

    if (currentScrollTop >= maxScroll - 2) {
      setScrollDirection(null)
      setScrollVelocity(0)
    }

    prevScrollTopRef.current = currentScrollTop
  }, [])

  const showEntrance = messages.length === 0 && !currentPlan && !isStreaming

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4"
    >
      {showEntrance ? (
        <div className="flex items-center justify-center h-full overflow-hidden">
          <p className="text-slate-400 text-base select-none whitespace-nowrap">
            {[...'来与LeisureAgent设计一场周末出行吧~'].map((char, i) => {
              const cfg = charConfigs[i]
              const delay = i * 0.04
              return (
                <motion.span
                  key={i}
                  className="inline-block"
                  initial={{ x: cfg.startX, y: cfg.startY, opacity: 0, rotate: cfg.startRotate }}
                  animate={entranceReady ? { x: 0, y: 0, opacity: 1, rotate: 0 } : { x: cfg.startX, y: cfg.startY, opacity: 0, rotate: cfg.startRotate }}
                  transition={{
                    x: { type: 'spring', stiffness: cfg.stiffnessX, damping: cfg.dampingX, delay },
                    y: { type: 'spring', stiffness: cfg.stiffnessY, damping: cfg.dampingY, delay: delay + 0.02 },
                    rotate: { type: 'spring', stiffness: cfg.stiffnessR, damping: cfg.dampingR, delay },
                    opacity: { duration: 0.3, delay },
                  }}
                >
                  {char}
                </motion.span>
              )
            })}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center py-6">
          {messages.map((msg, i) => (
              <React.Fragment key={msg.id}>
                <MessageBubble
                  message={msg}
                  scrollDirection={scrollDirection}
                  scrollVelocity={scrollVelocity}
                />
                {/* 每条用户消息后展示其处理记录（历史+流式） */}
                {msg.role === 'user' && (
                  (() => {
                    const steps = stepHistory.get(i)
                    if (!steps || steps.length === 0) return null
                    const isActive = isStreaming && i === activeUserMsgIdx
                    return <ProcessingRecord streamSteps={steps} isStreaming={isActive} />
                  })()
                )}
              </React.Fragment>
            ))}

          {/* Plan View — shown after messages when plan exists */}
          {currentPlan && (
            <PlanView
              plan={currentPlan}
              executeResults={executeResults}
              executing={executing}
              exceptions={exceptions}
              warnings={warnings}
              resolvedLocations={resolvedLocations}
              dayCount={dayCount}
              travelModeConfirmed={travelModeConfirmed}
              onExecute={onExecute}
              onRegenerate={onRegenerate}
              onOther={onOther}
              onShowMap={onShowMap}
              onShowTravelMode={onShowTravelMode}
              onShare={onShare}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ==================== ConversationSidebar ====================

function ConversationSidebar({
  isOpen,
  sessions,
  activeId,
  isLoading,
  disabled,
  onSelect,
  onDelete,
  onNew,
}: {
  isOpen: boolean
  sessions: AgentSession[]
  activeId: number | null
  isLoading: boolean
  disabled: boolean
  onSelect: (id: number) => void
  onDelete: (id: number) => void
  onNew: () => void
}) {
  return (
    <motion.div
      className="h-full border-r-2 border-emerald-400/60 bg-white/60 backdrop-blur-sm flex flex-col shrink-0 overflow-hidden"
      animate={{ width: isOpen ? 260 : 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      <div className="w-[260px] flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-3 border-b border-slate-100">
          <span className="text-sm font-medium text-slate-500">
            {isLoading ? '加载中...' : `${sessions.length} 个会话`}
          </span>
          <button
            onClick={onNew}
            disabled={disabled}
            className="flex items-center gap-1 text-sm text-white bg-blue-500 hover:bg-blue-600 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
          >
            <Plus size={14} weight="bold" />
            新对话
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 && !isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 select-none">
              暂无历史会话
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => { if (!disabled) onSelect(s.id) }}
                className={`group flex items-center gap-2 px-3 py-2.5 mx-2 mt-1 rounded-lg transition-colors ${
                  disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                } ${
                  activeId === s.id
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="flex-1 text-sm truncate">{s.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!disabled) onDelete(s.id)
                  }}
                  disabled={disabled}
                  className={`hidden group-hover:flex p-1.5 rounded transition-colors disabled:!hidden ${
                    activeId === s.id
                      ? 'text-white/70 hover:text-white hover:bg-white/20'
                      : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                  }`}
                >
                  <Trash size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ==================== ChatInput ====================

function ChatInput({
  onSend,
  disabled,
  stage,
}: {
  onSend: (text: string) => void
  disabled: boolean
  stage: string
}) {
  const [input, setInput] = useState('')

  const handleSend = () => {
    const text = input.trim()
    if (!text || disabled) return
    setInput('')
    onSend(text)
  }

  const getPlaceholder = () => {
    switch (stage) {
      case 'reviewing':
        return '输入修改意见，如"换一家近的餐厅"，或输入"确认"执行预约...'
      case 'executed':
        return '预约已完成，方案已锁定。新建对话可重新规划'
      default:
        return '描述你的需求，如：下午带老婆孩子出去玩...'
    }
  }

  if (stage === 'executed') {
    return (
      <div className="border-t-2 border-emerald-400/60 bg-white/60 backdrop-blur-sm px-4 py-4">
        <div className="max-w-xl mx-auto text-center">
          <span className="text-sm text-slate-400">预约已完成，此会话已锁定</span>
        </div>
      </div>
    )
  }

  return (
    <div className="border-t-2 border-emerald-400/60 bg-white/60 backdrop-blur-sm px-4 py-4">
      <div className="max-w-xl mx-auto flex items-center gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={getPlaceholder()}
          className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-300 focus:bg-white transition-colors disabled:opacity-50"
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend()
          }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="p-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {disabled ? (
            <Spinner size={18} className="animate-spin" />
          ) : (
            <PaperPlaneTilt weight="fill" size={18} />
          )}
        </button>
      </div>
    </div>
  )
}

// ==================== AIPlanPage ====================

export function AIPlanPage({ onBack }: { onBack: () => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [ready, setReady] = useState(false)
  const [sessions, setSessions] = useState<AgentSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentPlan, setCurrentPlan] = useState<AgentPlan | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  interface StepItem { phase: string; label: string; status: 'active' | 'completed'; startedAt: number; elapsed?: number }
  type StepHistory = Map<number, StepItem[]>
  const [stepHistory, setStepHistory] = useState<StepHistory>(new Map())
  const activeUserMsgIdxRef = useRef(-1)
  const [executing, setExecuting] = useState(false)
  const [executeResults, setExecuteResults] = useState<ExecuteResult[] | null>(null)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [stage, setStage] = useState<string>('chatting')
  const [exceptions, setExceptions] = useState<ExceptionEvent | null>(null)
  const [warningsList, setWarningsList] = useState<string[]>([])
  const [inquiryData, setInquiryData] = useState<InquiryEvent | null>(null)
  const [showInquiryModal, setShowInquiryModal] = useState(false)
  const [showTravelModeSelector, setShowTravelModeSelector] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [travelModeConfirmed, setTravelModeConfirmed] = useState(false)
  const [sharePlanId, setSharePlanId] = useState<number | null>(null)
  const [resolvedLocations, setResolvedLocations] = useState<Map<number, ResolvedLocation | null>>(new Map())
  const [dayCount, setDayCount] = useState(1)
  const abortRef = useRef<AbortController | null>(null)
  const hasPlanOrInquiryRef = useRef(false)
  const pendingNewSessionRef = useRef(false)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 640)
    return () => clearTimeout(t)
  }, [])

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true)
    try {
      const res = await getAgentSessions()
      if (res.code === 0) setSessions(res.data.list)
    } catch {
      // Silently fail, sessions list is non-critical
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // 活跃步骤实时计时器（每 100ms 刷新）
  useEffect(() => {
    if (!isStreaming) return
    const timer = setInterval(() => {
      setStepHistory((prev) => {
        const idx = activeUserMsgIdxRef.current
        if (idx < 0) return prev
        const steps = prev.get(idx)
        if (!steps || !steps.some((s) => s.status === 'active')) return prev
        const now = Date.now()
        const next = new Map(prev)
        next.set(idx, steps.map((s) =>
          s.status === 'active'
            ? { ...s, elapsed: Math.round((now - s.startedAt) / 100) / 10 }
            : s
        ))
        return next
      })
    }, 100)
    return () => clearInterval(timer)
  }, [isStreaming])

  const handleSelectSession = async (id: number) => {
    setActiveSessionId(id)
    setStepHistory(new Map())
    activeUserMsgIdxRef.current = -1
    try {
      const res = await getAgentSession(id)
      if (res.code === 0 && res.data) {
        const msgs: ChatMessage[] = res.data.messages.map((m: AgentMessage, idx: number) => ({
          id: `hist-${idx}`,
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
        setMessages(msgs)
        // 恢复处理记录（新格式：[[interaction1], [interaction2], ...]）
        if (res.data.processing_log) {
          try {
            const log = JSON.parse(res.data.processing_log)
            if (Array.isArray(log) && log.length > 0 && Array.isArray(log[0])) {
              // 新格式：数组的数组，按用户消息索引匹配
              const hist = new Map<number, StepItem[]>()
              let userIdx = 0
              for (let i = 0; i < msgs.length && userIdx < log.length; i++) {
                if (msgs[i].role === 'user') {
                  const steps: StepItem[] = (log[userIdx] || []).map((s: { label: string; elapsed: number }) => ({
                    phase: '', label: s.label, status: 'completed' as const, startedAt: 0, elapsed: s.elapsed,
                  }))
                  if (steps.length > 0) hist.set(i, steps)
                  userIdx++
                }
              }
              setStepHistory(hist)
            } else {
              // 旧格式兼容：单数组归到最后一个用户消息
              const hist = new Map<number, StepItem[]>()
              let lastUserIdx = -1
              for (let i = msgs.length - 1; i >= 0; i--) {
                if (msgs[i].role === 'user') { lastUserIdx = i; break }
              }
              if (lastUserIdx >= 0) {
                hist.set(lastUserIdx, (Array.isArray(log) ? log : []).map((s: { label: string; elapsed: number }) => ({
                  phase: '', label: s.label, status: 'completed' as const, startedAt: 0, elapsed: s.elapsed,
                })))
              }
              setStepHistory(hist)
            }
          } catch { setStepHistory(new Map()) }
        }
        // 恢复会话中的 plan 和 stage
        if (res.data.plan) {
          setCurrentPlan(res.data.plan)
          setTravelModeConfirmed(false)
          // 从 plan items 构建 resolvedLocations（供 TravelModeSelector 和地图使用）
          const locMap = new Map<number, ResolvedLocation | null>()
          res.data.plan.items.forEach((item, i) => {
            locMap.set(i, {
              name: item.location_name,
              x: item.location_x || 0,
              y: item.location_y || 0,
              theme: 'orange' as const,
              typeLabel: '',
              subtypeLabel: null,
              address: item.address || '',
            })
          })
          setResolvedLocations(locMap)
        } else {
          setCurrentPlan(null)
          setTravelModeConfirmed(false)
        }
        setExecuteResults(null)
        // status: 0=active, 1=has_plan(reviewing), 2=executed
        const statusMap: Record<number, string> = { 0: 'chatting', 1: 'reviewing', 2: 'executed' }
        setStage(statusMap[res.data.status] || 'chatting')
      }
    } catch {
      toast.error('加载会话失败')
    }
  }

  const handleDeleteSession = async (id: number) => {
    try {
      const res = await deleteAgentSession(id)
      if (res.code === 0) {
        setSessions((prev) => prev.filter((s) => s.id !== id))
        if (activeSessionId === id) {
          setActiveSessionId(null)
          setMessages([])
          setCurrentPlan(null)
          setExecuteResults(null)
        }
        toast.success('会话已删除')
      }
    } catch {
      toast.error('删除失败')
    }
  }

  const handleNew = () => {
    setActiveSessionId(null)
    setMessages([])
    setCurrentPlan(null)
    setExecuteResults(null)
    setStepHistory(new Map())
    setStage('chatting')
    setExceptions(null)
    setWarningsList([])
    setInquiryData(null)
    setShowInquiryModal(false)
    setDayCount(1)
    setTravelModeConfirmed(false)
  }

  const handleAddToPlan = (itemNames: string[]) => {
    setShowInquiryModal(false)
    setInquiryData(null)
    const text = `把${itemNames.join('、')}加入计划`
    handleSend(text)
  }

  const handleOther = (feedback: string) => {
    setShowInquiryModal(false)
    setInquiryData(null)
    if (feedback.trim()) {
      handleSend(feedback.trim())
    }
  }

  const handleSend = async (text: string) => {
    // Abort any ongoing stream
    abortRef.current?.abort()

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    }
    // 记录此用户消息在 messages 中的索引（添加前 = messages.length）
    const userMsgIdx = messages.length
    activeUserMsgIdxRef.current = userMsgIdx
    setMessages((prev) => [...prev, userMsg])
    // 确认/执行流程不消除已展示的计划，保持可见
    const isConfirmFlow = text.trim() === '确认' && currentPlan != null
    if (!isConfirmFlow) {
      setCurrentPlan(null)
      setDayCount(1)
      setTravelModeConfirmed(false)
    }
    setExecuteResults(null)
    setExceptions(null)
    setWarningsList([])
    setIsStreaming(true)
    // 新交互：追加到 stepHistory
    setStepHistory((prev) => {
      const next = new Map(prev)
      next.set(userMsgIdx, [{ phase: '', label: '正在处理...', status: 'active' as const, startedAt: Date.now() }])
      return next
    })
    hasPlanOrInquiryRef.current = false
    pendingNewSessionRef.current = !activeSessionId

    // 辅助：更新当前活跃交互的步骤
    const updateSteps = (updater: (prev: StepItem[]) => StepItem[]) => {
      setStepHistory((prev) => {
        const idx = activeUserMsgIdxRef.current
        if (idx < 0) return prev
        const steps = prev.get(idx) || []
        const next = new Map(prev)
        next.set(idx, updater(steps))
        return next
      })
    }

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await chatStream(
        text,
        activeSessionId ?? 0,
        {
          onToken: (data: TokenEvent) => {
            // 新会话：load_session 返回 session_id 后立刻刷新侧边栏
            if (data.node === 'load_session' && data.session_id && pendingNewSessionRef.current) {
              pendingNewSessionRef.current = false
              setActiveSessionId(data.session_id)
              fetchSessions()
            }
            if (data.day_count && data.day_count > 1) {
              setDayCount(data.day_count)
            }

            const phase = NODE_PHASES[data.node]
            if (!phase) return

            // 合并 0s 步骤：小于 0.5s 的快速节点不新建步骤，仅更新当前标签
            const FAST_THRESHOLD = 0.5

            updateSteps((prev) => {
              const now = Date.now()
              const activeIdx = prev.findIndex((s) => s.status === 'active')

              if (activeIdx < 0) return prev

              const activeStep = prev[activeIdx]

              // 初始占位步骤 → 直接替换，不展示 0s
              if (activeStep.phase === '') {
                const label = NODE_LABELS[data.node] || data.message || '处理中...'
                return [{ phase, label, status: 'active' as const, startedAt: now }]
              }

              const elapsed = Math.round((now - activeStep.startedAt) / 100) / 10

              // 同 phase → 更新标签（阶段内子步骤）
              if (activeStep.phase === phase) {
                const label = NODE_LABELS[data.node] || data.message || '处理中...'
                return prev.map((s, i) =>
                  i === activeIdx ? { ...s, label, elapsed } : s
                )
              }

              // 跨 phase：完成当前步骤，开新步骤
              // 若当前步骤 < FAST_THRESHOLD，不保留（避免 0s 污染）
              let label = NODE_LABELS[data.node] || data.message || '处理中...'
              if (data.node === 'search_candidates' && data.day_count && data.day_count > 1) {
                label = `已理解需求：${data.day_count} 天行程`
              }
              if (elapsed < FAST_THRESHOLD) {
                // 删除过快的步骤，用新步骤替代
                return prev
                  .filter((_, i) => i !== activeIdx)
                  .concat([{ phase, label, status: 'active' as const, startedAt: now }])
              }
              return prev.map((s, i) =>
                i === activeIdx
                  ? { ...s, status: 'completed' as const, elapsed }
                  : s
              ).concat([{ phase, label, status: 'active' as const, startedAt: now }])
            })

            const step = data.current_step || ''
            const isFinal = step === 'done' || step === 'direct_reply'
            if (data.message && isFinal) {
              setMessages((prev) => [...prev, {
                id: `${Date.now()}-${prev.length}`,
                role: 'assistant' as const,
                content: data.message,
              }])
            }
          },
          onStep: (data: StepEvent) => {
            updateSteps((prev) => {
              const activeIdx = prev.findIndex((s) => s.status === 'active')
              if (activeIdx < 0) return prev
              return prev.map((s, i) =>
                i === activeIdx ? { ...s, label: data.label } : s
              )
            })
          },
          onPlan: async (plan: AgentPlan) => {
            hasPlanOrInquiryRef.current = true
            setCurrentPlan(plan)
            setTravelModeConfirmed(false)
            setStage('reviewing')
            // 解析所有地点坐标
            const locMap = new Map<number, ResolvedLocation | null>()
            await Promise.all(
              plan.items.map(async (item: AgentPlanItem, i: number) => {
                try {
                  locMap.set(i, await resolveLocation(item.location_table_name, item.location_id))
                } catch {
                  locMap.set(i, null)
                }
              })
            )
            setResolvedLocations(locMap)
            try {
              const res = await getAgentSessions()
              if (res.code === 0) {
                setSessions(res.data.list)
                if (res.data.list.length > 0 && !activeSessionId) {
                  setActiveSessionId(res.data.list[0].id)
                }
              }
            } catch { /* refresh failed, non-critical */ }
          },
          onDone: () => {
            const now = Date.now()
            updateSteps((prev) => prev.map((s) =>
              s.status === 'active'
                ? { ...s, status: 'completed' as const, elapsed: Math.round((now - s.startedAt) / 100) / 10 }
                : s
            ))
            setIsStreaming(false)
          },
          onError: (msg: string) => {
            setIsStreaming(false)
            updateSteps(() => [])
            toast.error(msg)
          },
          onInquiry: (data: InquiryEvent) => {
            hasPlanOrInquiryRef.current = true
            setIsStreaming(false)
            updateSteps(() => [])
            setInquiryData(data)
            setShowInquiryModal(true)
            setStage('chatting')
          },
          onGuardReject: (msg: string) => {
            hasPlanOrInquiryRef.current = true
            setIsStreaming(false)
            updateSteps(() => [])
            setMessages((prev) => [...prev, {
              id: Date.now().toString(),
              role: 'assistant',
              content: msg,
            }])
          },
          onExceptions: (data: ExceptionEvent) => {
            setExceptions(data)
            if (data.warnings) setWarningsList(data.warnings)
          },
          onStage: (data: StageEvent) => {
            setStage(data.stage)
          },
          onExecuteResult: (data: ExecuteResult[]) => {
            setExecuteResults(data)
            setStage('executed')
          },
        },
        controller.signal,
      )
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setIsStreaming(false)
      updateSteps(() => [])
      toast.error('请求失败，请检查网络')
    }
  }

  const handleExecute = () => {
    handleSend('确认')
  }

  const handleOtherFeedback = (feedback: string) => {
    handleSend(feedback)
  }

  const handleShowTravelMode = () => {
    setShowTravelModeSelector(true)
  }

  const handleRegenerate = () => {
    setMessages([])
    setCurrentPlan(null)
    setExecuteResults(null)
    setExceptions(null)
    setWarningsList([])
    setStepHistory(new Map())
    setStage('chatting')
    setDayCount(1)
    setTravelModeConfirmed(false)
  }

  const sideLeft = sidebarOpen ? 246 : 4

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden relative">
      <motion.div
        className="absolute inset-0 bg-slate-50/50"
        initial={{ opacity: 0 }}
        animate={ready ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />

      <div className="relative z-10 flex flex-col h-full">
        <motion.nav
          className="border-b-2 border-emerald-400/60 bg-white/80 backdrop-blur-sm shrink-0"
          initial={{ y: -60, opacity: 0 }}
          animate={ready ? { y: 0, opacity: 1 } : { y: -60, opacity: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              onClick={onBack}
              disabled={isStreaming || executing}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft size={20} weight="bold" />
            </button>
            <span className="text-base font-medium text-slate-800 flex-1">AI 一键规划</span>
            <button
              onClick={() => { window.location.hash = '/travel-plans' }}
              disabled={isStreaming || executing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <User weight="bold" size={20} />
              <span className="text-sm font-medium">我的计划</span>
            </button>
          </div>
        </motion.nav>

        <div className="flex-1 flex overflow-hidden relative">
          <motion.div
            initial={{ x: -280, opacity: 0 }}
            animate={ready ? { x: 0, opacity: 1 } : { x: -280, opacity: 0 }}
            transition={{ duration: 0.45, delay: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <ConversationSidebar
              isOpen={sidebarOpen}
              sessions={sessions}
              activeId={activeSessionId}
              isLoading={sessionsLoading}
              disabled={isStreaming || executing}
              onSelect={handleSelectSession}
              onDelete={handleDeleteSession}
              onNew={handleNew}
            />
          </motion.div>

          <motion.div
            className="absolute z-10 top-1/2 -translate-y-1/2"
            initial={{ left: sideLeft, opacity: 0 }}
            animate={{ left: sideLeft, opacity: ready ? 1 : 0 }}
            transition={{
              left: { duration: 0.25, ease: 'easeInOut' },
              opacity: { duration: 0.3, delay: 0.5 },
            }}
          >
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              disabled={isStreaming || executing}
              className="p-2 bg-emerald-500 text-white rounded-full shadow-md hover:bg-emerald-600 hover:shadow-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {sidebarOpen ? <CaretLeft size={16} weight="bold" /> : <CaretRight size={16} weight="bold" />}
            </button>
          </motion.div>

          <div className="flex-1 flex flex-col min-w-0">
            <motion.div
              className="flex-1 flex flex-col min-h-0"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={ready ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, delay: 0.65, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <ErrorBoundary>
                <ChatArea
                  messages={messages}
                  currentPlan={currentPlan}
                  executeResults={executeResults}
                  isStreaming={isStreaming}
                  stepHistory={stepHistory}
                  activeUserMsgIdx={activeUserMsgIdxRef.current}
                  executing={executing}
                  entranceReady={ready}
                  exceptions={exceptions}
                  warnings={warningsList}
                  resolvedLocations={resolvedLocations}
                  dayCount={dayCount}
                  travelModeConfirmed={travelModeConfirmed}
                  onExecute={handleExecute}
                  onRegenerate={handleRegenerate}
                  onOther={handleOtherFeedback}
                  onShowMap={() => setShowMap(true)}
                  onShowTravelMode={handleShowTravelMode}
                  onShare={() => {
                    if (currentPlan?.id != null) setSharePlanId(currentPlan.id)
                  }}
                />
              </ErrorBoundary>
            </motion.div>

            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={ready ? { y: 0, opacity: 1 } : { y: 40, opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <ChatInput onSend={handleSend} disabled={isStreaming || executing} stage={stage} />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Inquiry Modal */}
      <AnimatePresence>
        {showInquiryModal && inquiryData && (
          <InquiryModal
            data={inquiryData}
            onClose={() => {
              setShowInquiryModal(false)
              setInquiryData(null)
            }}
            onAddToPlan={handleAddToPlan}
            onOther={handleOther}
          />
        )}
      </AnimatePresence>

      {/* Travel Mode Selector */}
      <AnimatePresence>
        {showTravelModeSelector && currentPlan && (
          <TravelModeSelector
            items={currentPlan.items}
            locations={resolvedLocations}
            onConfirm={async (updatedItems) => {
              const planId = currentPlan?.id
              if (planId) {
                try {
                  await updateTravelModes(planId, updatedItems.map((it) => it.travel_mode))
                } catch { /* 非关键，落库失败不阻断 */ }
              }
              setCurrentPlan((prev) => prev ? { ...prev, items: updatedItems } : prev)
              setShowTravelModeSelector(false)
              setTravelModeConfirmed(true)
              toast.success('出行方式已更新，可以确认方案了')
            }}
            onClose={() => setShowTravelModeSelector(false)}
            onOther={(feedback: string) => {
              setShowTravelModeSelector(false)
              if (feedback.trim()) handleSend(feedback.trim())
            }}
          />
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <ShareModal
        isOpen={sharePlanId !== null}
        onClose={() => setSharePlanId(null)}
        planTitle={currentPlan?.title || ''}
        shareUrl={sharePlanId !== null ? `${window.location.origin}${window.location.pathname}#/travel-plans/${encodePlanId(sharePlanId)}` : ''}
      />

      {/* Map View */}
      <AnimatePresence>
        {showMap && currentPlan && (
          <PlanMapView
            points={currentPlan.items.map((item, idx) => {
              const loc = resolvedLocations.get(idx)
              return {
                name: loc?.name || item.location_name || '未知',
                x: item.location_x || loc?.x || 0,
                y: item.location_y || loc?.y || 0,
                arriveTime: item.arrive_time || '',
                leaveTime: item.leave_time || '',
                theme: loc?.theme || 'orange',
                typeLabel: loc?.typeLabel || '',
                dayNum: item.day_num || 1,
                dayLabel: item.day_label || '',
              }
            })}
            onClose={() => setShowMap(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
