import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  CaretLeft,
  CaretRight,
  PencilSimple,
  PushPin,
  Trash,
  User,
  Robot,
  PaperPlaneTilt,
  ArrowLeft,
} from '@phosphor-icons/react'

// ==================== Types ====================

interface Conversation {
  id: string
  title: string
  pinned: boolean
  messages: Message[]
}

interface Message {
  id: string
  role: 'user' | 'ai'
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
  message: Message
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
      {/* 装饰小气泡 */}
      {decorativeBubbles.map((config, i) => (
        <DecorativeBubble
          key={i}
          config={config}
          scrollDirection={scrollDirection}
          scrollVelocity={scrollVelocity}
        />
      ))}

      {/* 主气泡 */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
        className={`relative bg-white rounded-2xl border ${borderColor} shadow-sm max-w-xl w-full mx-4`}
      >
        {/* 标签 */}
        <div className="flex justify-center -mt-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${labelColor} shadow-sm`}
          >
            <Icon weight="fill" size={12} />
            {labelText}
          </span>
        </div>

        {/* 内容 */}
        <div className="px-5 py-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ==================== ChatArea ====================

function ChatArea({ messages, entranceReady }: { messages: Message[]; entranceReady: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const prevScrollTopRef = useRef(0)
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null)
  const [scrollVelocity, setScrollVelocity] = useState(0)

  // 逐字风拂动画参数（仅生成一次）
  const charConfigs = useMemo(() => {
    const text = '来与LeisureAgent设计一场周末出行吧~'
    return [...text].map(() => {
      const startX = -(300 + Math.random() * 400)
      const startY = -(60 + Math.random() * 80) // 起点在偏上方
      const startRotate = (Math.random() - 0.5) * 55
      return {
        startX,
        startY,
        startRotate,
        // x: 较快到达，轻微弹性
        stiffnessX: 45 + Math.random() * 25,
        dampingX: 10 + Math.random() * 5,
        // y: 极软弹簧，大幅上下波动后缓慢归位
        stiffnessY: 15 + Math.random() * 15,
        dampingY: 3 + Math.random() * 3,
        // rotate: 中等弹性
        stiffnessR: 25 + Math.random() * 20,
        dampingR: 6 + Math.random() * 4,
      }
    })
  }, [])

  // 自动滚到底部
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  // 滚动方向检测
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

    // 滚到底部时清除方向
    if (currentScrollTop >= maxScroll - 2) {
      setScrollDirection(null)
      setScrollVelocity(0)
    }

    prevScrollTopRef.current = currentScrollTop
  }, [])

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4"
    >
      {messages.length === 0 ? (
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
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              scrollDirection={scrollDirection}
              scrollVelocity={scrollVelocity}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== ConversationSidebar ====================

function ConversationSidebar({
  isOpen,
}: {
  isOpen: boolean
}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)

  const handleNew = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: '新对话',
      pinned: false,
      messages: [],
    }
    setConversations((prev) => [newConv, ...prev])
    setActiveId(newConv.id)
  }

  const handleDelete = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (activeId === id) setActiveId(null)
  }

  const handleTogglePin = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    )
  }

  const handleStartRename = (conv: Conversation) => {
    setEditingId(conv.id)
    setEditTitle(conv.title)
  }

  const handleFinishRename = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: editTitle || c.title } : c))
    )
    setEditingId(null)
  }

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return 0
    })
  }, [conversations])

  return (
    <motion.div
      className="h-full border-r-2 border-emerald-400/60 bg-white/60 backdrop-blur-sm flex flex-col shrink-0 overflow-hidden"
      animate={{ width: isOpen ? 260 : 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      <div className="w-[260px] flex flex-col h-full">
        {/* 新建 */}
        <div className="flex items-center px-3 py-3 border-b border-slate-100">
          <button
            onClick={handleNew}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Plus weight="bold" size={14} />
            新对话
          </button>
        </div>

        {/* 会话列表 */}
        <div className="flex-1 overflow-y-auto">
          {sortedConversations.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 select-none">
              暂无历史会话
            </div>
          ) : (
            sortedConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setActiveId(conv.id)}
                className={`group flex items-center gap-2 px-3 py-2.5 mx-2 mt-1 rounded-lg cursor-pointer transition-colors ${
                  activeId === conv.id
                    ? 'bg-blue-50/80 text-blue-700'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                {editingId === conv.id ? (
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => handleFinishRename(conv.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFinishRename(conv.id)
                    }}
                    autoFocus
                    className="flex-1 text-sm bg-white border border-blue-300 rounded px-2 py-0.5 outline-none focus:border-blue-400"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="flex-1 text-sm truncate">{conv.title}</span>
                )}

                <div className="hidden group-hover:flex items-center gap-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStartRename(conv)
                    }}
                    className="p-1.5 rounded hover:bg-slate-200/60 text-slate-500 hover:text-slate-600 transition-colors"
                  >
                    <PencilSimple size={13} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTogglePin(conv.id)
                    }}
                    className={`p-1 rounded hover:bg-slate-200/60 transition-colors ${
                      conv.pinned ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <PushPin size={12} weight={conv.pinned ? 'fill' : 'regular'} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(conv.id)
                    }}
                    className="p-1.5 rounded hover:bg-red-50 text-slate-500 hover:text-red-500 transition-colors"
                  >
                    <Trash size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ==================== ChatInput ====================

function ChatInput() {
  const [input, setInput] = useState('')

  return (
    <div className="border-t-2 border-emerald-400/60 bg-white/60 backdrop-blur-sm px-4 py-4">
      <div className="max-w-xl mx-auto flex items-center gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入你的需求..."
          className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-300 focus:bg-white transition-colors"
          onKeyDown={(e) => {
            if (e.key === 'Enter') setInput('')
          }}
        />
        <button className="p-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shrink-0">
          <PaperPlaneTilt weight="fill" size={18} />
        </button>
      </div>
    </div>
  )
}

// ==================== AIPlanPage ====================

export function AIPlanPage({ onBack }: { onBack: () => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 640)
    return () => clearTimeout(t)
  }, [])

  const sideLeft = sidebarOpen ? 246 : 4

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden relative">
      {/* 背景层 — 白屏消退后淡入 */}
      <motion.div
        className="absolute inset-0 bg-slate-50/50"
        initial={{ opacity: 0 }}
        animate={ready ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />

      {/* 内容层 */}
      <div className="relative z-10 flex flex-col h-full">
        {/* 顶部导航 — 从上方滑入 */}
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
            <span className="text-base font-medium text-slate-800">AI 一键规划</span>
          </div>
        </motion.nav>

        {/* 主体：侧边栏 + 对话区 */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* 侧边栏 — 从左侧滑入 */}
          <motion.div
            initial={{ x: -280, opacity: 0 }}
            animate={ready ? { x: 0, opacity: 1 } : { x: -280, opacity: 0 }}
            transition={{ duration: 0.45, delay: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <ConversationSidebar isOpen={sidebarOpen} />
          </motion.div>

          {/* 折叠/展开按钮 — 淡入 */}
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

          {/* 对话 + 输入区 */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* 对话区 — 缩放+淡入 */}
            <motion.div
              className="flex-1 flex flex-col min-h-0"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={ready ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, delay: 0.65, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <ChatArea messages={[]} entranceReady={ready} />
            </motion.div>

            {/* 输入框 — 从下方滑入 */}
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={ready ? { y: 0, opacity: 1 } : { y: 40, opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <ChatInput />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
