import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
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
} from '@phosphor-icons/react'
import { toast } from '../components/Toast'
import {
  getAgentSessions,
  getAgentSession,
  deleteAgentSession,
  executePlan,
  chatStream,
  type AgentSession,
  type AgentMessage,
  type AgentPlan,
  type AgentPlanItem,
  type TokenEvent,
  type ExecuteResult,
} from '../api'

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

const TABLE_TYPE_INFO: Record<string, { typeLabel: string; theme: string; dot: string }> = {
  restaurant: { typeLabel: '餐厅', theme: 'bg-orange-50 text-orange-600 border-orange-200', dot: 'bg-orange-400' },
  scenic_spot: { typeLabel: '景点', theme: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-400' },
  mall: { typeLabel: '商场', theme: 'bg-pink-50 text-pink-600 border-pink-200', dot: 'bg-pink-400' },
  exhibition_hall: { typeLabel: '展馆', theme: 'bg-violet-50 text-violet-600 border-violet-200', dot: 'bg-violet-400' },
  amusement_park: { typeLabel: '乐园', theme: 'bg-amber-50 text-amber-600 border-amber-200', dot: 'bg-amber-400' },
}

const NODE_LABELS: Record<string, string> = {
  load_session: '正在准备...',
  analyze_goal: '正在分析需求...',
  search_candidates: '正在搜索候选地点...',
  compose_plan: '正在生成方案...',
  persist_plan: '正在保存方案...',
  finalize: '正在生成分享文案...',
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

// ==================== PlanView ====================

function PlanView({
  plan,
  executeResults,
  executing,
  onExecute,
  onRegenerate,
}: {
  plan: AgentPlan
  executeResults: ExecuteResult[] | null
  executing: boolean
  onExecute: () => void
  onRegenerate: () => void
}) {
  const itemsByType = useMemo(() => {
    const map = new Map<string, AgentPlanItem[]>()
    for (const item of plan.items) {
      const key = item.activity_type
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return map
  }, [plan.items])

  const allResults = plan.items.map((item) => {
    if (!executeResults) return null
    return executeResults.find(
      (r) => r.location_table_name === item.location_table_name && r.location_id === item.location_id,
    ) ?? null
  })

  const hasExecuted = executeResults !== null

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
          <h3 className="text-lg font-semibold text-slate-900 mb-1">{plan.title}</h3>
          {plan.description && (
            <p className="text-sm text-slate-500 mb-3">{plan.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 font-medium">
              {plan.travel_type}
            </span>
            <span>预估费用 <span className="text-slate-900 font-medium">¥{plan.total_cost}</span></span>
            <span>共 {plan.items.length} 个行程</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative pl-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {plan.items.map((item, idx) => {
            const info = TABLE_TYPE_INFO[item.location_table_name] ?? TABLE_TYPE_INFO.restaurant
            const activityLabel = ACTIVITY_TYPE_LABELS[item.activity_type] || item.activity_type

            return (
              <div key={idx} className="relative mb-4 last:mb-0">
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
                {hasExecuted && allResults[idx] && (
                  <div className={`mt-1 ml-1 flex items-center gap-1 text-xs ${
                    allResults[idx]!.status === 'success' ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {allResults[idx]!.status === 'success'
                      ? <CheckCircle size={12} weight="fill" />
                      : <XCircle size={12} weight="fill" />
                    }
                    {allResults[idx]!.message}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Action Buttons */}
        {!hasExecuted && (
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={onExecute}
              disabled={executing}
              className="flex-1 py-2.5 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 active:scale-[0.98] shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {executing ? '正在执行预约...' : '确认方案，执行预约'}
            </button>
            <button
              onClick={onRegenerate}
              disabled={executing}
              className="px-4 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-200 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              重新生成
            </button>
          </div>
        )}

        {/* Execution Summary */}
        {hasExecuted && (
          <div className="mt-6 bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-700 mb-2">
              {executeResults.every((r) => r.status === 'success') ? '全部预约成功' : '部分预约失败'}
            </p>
            <button
              onClick={onRegenerate}
              className="text-sm text-blue-500 hover:text-blue-600 transition-colors"
            >
              发起新规划
            </button>
          </div>
        )}
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
  streamProgress,
  executing,
  entranceReady,
  onExecute,
  onRegenerate,
}: {
  messages: ChatMessage[]
  currentPlan: AgentPlan | null
  executeResults: ExecuteResult[] | null
  isStreaming: boolean
  streamProgress: string
  executing: boolean
  entranceReady: boolean
  onExecute: () => void
  onRegenerate: () => void
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
      ) : currentPlan ? (
        <PlanView
          plan={currentPlan}
          executeResults={executeResults}
          executing={executing}
          onExecute={onExecute}
          onRegenerate={onRegenerate}
        />
      ) : (
        <div className="flex flex-col items-center py-6">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              scrollDirection={scrollDirection}
              scrollVelocity={scrollVelocity}
            />
          ))}

          {/* Progress Indicator */}
          {isStreaming && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center py-6 gap-3"
            >
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-2xl border border-indigo-200/40 shadow-sm">
                <Spinner size={16} className="text-indigo-500 animate-spin" />
                <span className="text-sm text-slate-500">{streamProgress || '正在处理...'}</span>
              </div>
            </motion.div>
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
  onSelect,
  onDelete,
  onNew,
}: {
  isOpen: boolean
  sessions: AgentSession[]
  activeId: number | null
  isLoading: boolean
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
            className="flex items-center gap-1 text-sm text-white bg-blue-500 hover:bg-blue-600 px-2.5 py-1 rounded-lg transition-colors"
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
                onClick={() => onSelect(s.id)}
                className={`group flex items-center gap-2 px-3 py-2.5 mx-2 mt-1 rounded-lg cursor-pointer transition-colors ${
                  activeId === s.id
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="flex-1 text-sm truncate">{s.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(s.id)
                  }}
                  className={`hidden group-hover:flex p-1.5 rounded transition-colors ${
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
}: {
  onSend: (text: string) => void
  disabled: boolean
}) {
  const [input, setInput] = useState('')

  const handleSend = () => {
    const text = input.trim()
    if (!text || disabled) return
    setInput('')
    onSend(text)
  }

  return (
    <div className="border-t-2 border-emerald-400/60 bg-white/60 backdrop-blur-sm px-4 py-4">
      <div className="max-w-xl mx-auto flex items-center gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="描述你的需求，如：下午带老婆孩子出去玩..."
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
  const [streamProgress, setStreamProgress] = useState('')
  const [executing, setExecuting] = useState(false)
  const [executeResults, setExecuteResults] = useState<ExecuteResult[] | null>(null)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

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

  const handleSelectSession = async (id: number) => {
    setActiveSessionId(id)
    try {
      const res = await getAgentSession(id)
      if (res.code === 0 && res.data) {
        const msgs: ChatMessage[] = res.data.messages.map((m: AgentMessage, idx: number) => ({
          id: `hist-${idx}`,
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
        setMessages(msgs)
        // If there's a plan in metadata, we don't have the full plan here; clear it
        setCurrentPlan(null)
        setExecuteResults(null)
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
    setStreamProgress('')
  }

  const handleSend = async (text: string) => {
    // Abort any ongoing stream
    abortRef.current?.abort()

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    }
    setMessages((prev) => [...prev, userMsg])
    setCurrentPlan(null)
    setExecuteResults(null)
    setIsStreaming(true)
    setStreamProgress('正在处理...')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await chatStream(
        text,
        activeSessionId ?? 0,
        {
          onToken: (data: TokenEvent) => {
            const label = NODE_LABELS[data.node] || data.message || '处理中...'
            setStreamProgress(label)
          },
          onPlan: async (plan: AgentPlan) => {
            setCurrentPlan(plan)
            setIsStreaming(false)
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
            setIsStreaming(false)
            setStreamProgress('')
          },
          onError: (msg: string) => {
            setIsStreaming(false)
            setStreamProgress('')
            toast.error(msg)
          },
        },
        controller.signal,
      )
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setIsStreaming(false)
      setStreamProgress('')
      toast.error('请求失败，请检查网络')
    }
  }

  const handleExecute = async () => {
    if (!currentPlan?.id) return
    setExecuting(true)
    try {
      const res = await executePlan(currentPlan.id)
      setExecuteResults(res.data)
      if (res.code === 0) {
        toast.success('全部预约成功')
      } else {
        toast.error(res.msg || '部分预约失败')
      }
    } catch {
      toast.error('执行预约失败')
    } finally {
      setExecuting(false)
    }
  }

  const handleRegenerate = () => {
    setMessages([])
    setCurrentPlan(null)
    setExecuteResults(null)
    setStreamProgress('')
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
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} weight="bold" />
            </button>
            <span className="text-base font-medium text-slate-800 flex-1">AI 一键规划</span>
            <button
              onClick={() => { window.location.hash = '/travel-plans' }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700"
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
              className="p-2 bg-emerald-500 text-white rounded-full shadow-md hover:bg-emerald-600 hover:shadow-lg transition-colors"
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
              <ChatArea
                messages={messages}
                currentPlan={currentPlan}
                executeResults={executeResults}
                isStreaming={isStreaming}
                streamProgress={streamProgress}
                executing={executing}
                entranceReady={ready}
                onExecute={handleExecute}
                onRegenerate={handleRegenerate}
              />
            </motion.div>

            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={ready ? { y: 0, opacity: 1 } : { y: 40, opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <ChatInput onSend={handleSend} disabled={isStreaming || executing} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
