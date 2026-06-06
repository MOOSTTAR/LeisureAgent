import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, User, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { toast } from '../components/Toast'
import { TravelModeSelector } from '../components/TravelModeSelector'
import { PlanMapView } from '../components/PlanMapView'
import { ShareModal } from '../components/ShareModal'
import { encodePlanId } from '../utils/shareCode'
import {
  ChatArea,
  ConversationSidebar,
  ChatInput,
  InquiryModal,
  NODE_LABELS,
  NODE_PHASES,
} from '../components/ai-plan'
import {
  getAgentSessions,
  getAgentSession,
  deleteAgentSession,
  chatStream,
  resolveLocation,
  updateTravelModes,
  type AgentSession,
  type AgentMessage,
  type AgentPlan,
  type AgentPlanItem,
  type ResolvedLocation,
  type TokenEvent,
  type ExecuteResult,
  type InquiryEvent,
  type ExceptionEvent,
  type StageEvent,
  type StepEvent,
} from '../api'
import type { ChatMessage } from '../components/ai-plan'

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

// ==================== Types ====================

interface StepItem { phase: string; label: string; status: 'active' | 'completed'; startedAt: number; elapsed?: number }
type StepHistory = Map<number, StepItem[]>

// ==================== AIPlanPage ====================

export function AIPlanPage() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [ready, setReady] = useState(false)
  const [sessions, setSessions] = useState<AgentSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentPlan, setCurrentPlan] = useState<AgentPlan | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
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

  // ── Entrance animation ──
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 640)
    return () => clearTimeout(t)
  }, [])

  // ── Fetch sessions ──
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

  useEffect(() => { fetchSessions() }, [fetchSessions])

  // ── Active step real-time timer (100ms) ──
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

  // ── Session management ──
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
        // Restore processing log
        if (res.data.processing_log) {
          try {
            const log = JSON.parse(res.data.processing_log)
            if (Array.isArray(log) && log.length > 0 && Array.isArray(log[0])) {
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
        // Restore plan and stage
        if (res.data.plan) {
          setCurrentPlan(res.data.plan)
          setTravelModeConfirmed(false)
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

  // ── Inquiry handlers ──
  const handleAddToPlan = (itemNames: string[]) => {
    setShowInquiryModal(false)
    setInquiryData(null)
    handleSend(`把${itemNames.join('、')}加入计划`)
  }

  const handleOther = (feedback: string) => {
    setShowInquiryModal(false)
    setInquiryData(null)
    if (feedback.trim()) handleSend(feedback.trim())
  }

  // ── Stream handling ──
  const handleSend = async (text: string) => {
    abortRef.current?.abort()

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text }
    const userMsgIdx = messages.length
    activeUserMsgIdxRef.current = userMsgIdx
    setMessages((prev) => [...prev, userMsg])

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

    setStepHistory((prev) => {
      const next = new Map(prev)
      next.set(userMsgIdx, [{ phase: '', label: '正在处理...', status: 'active' as const, startedAt: Date.now() }])
      return next
    })
    hasPlanOrInquiryRef.current = false
    pendingNewSessionRef.current = !activeSessionId

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
      await chatStream(text, activeSessionId ?? 0, {
        onToken: (data: TokenEvent) => {
          if (data.node === 'load_session' && data.session_id && pendingNewSessionRef.current) {
            pendingNewSessionRef.current = false
            setActiveSessionId(data.session_id)
            fetchSessions()
          }
          if (data.day_count && data.day_count > 1) setDayCount(data.day_count)

          const phase = NODE_PHASES[data.node]
          if (!phase) return

          const FAST_THRESHOLD = 0.5
          updateSteps((prev) => {
            const now = Date.now()
            const activeIdx = prev.findIndex((s) => s.status === 'active')
            if (activeIdx < 0) return prev

            const activeStep = prev[activeIdx]
            if (activeStep.phase === '') {
              const label = NODE_LABELS[data.node] || data.message || '处理中...'
              return [{ phase, label, status: 'active' as const, startedAt: now }]
            }

            const elapsed = Math.round((now - activeStep.startedAt) / 100) / 10
            if (activeStep.phase === phase) {
              const label = NODE_LABELS[data.node] || data.message || '处理中...'
              return prev.map((s, i) => i === activeIdx ? { ...s, label, elapsed } : s)
            }

            let label = NODE_LABELS[data.node] || data.message || '处理中...'
            if (data.node === 'search_candidates' && data.day_count && data.day_count > 1) {
              label = `已理解需求：${data.day_count} 天行程`
            }
            if (elapsed < FAST_THRESHOLD) {
              return prev.filter((_, i) => i !== activeIdx)
                .concat([{ phase, label, status: 'active' as const, startedAt: now }])
            }
            return prev.map((s, i) =>
              i === activeIdx ? { ...s, status: 'completed' as const, elapsed } : s
            ).concat([{ phase, label, status: 'active' as const, startedAt: now }])
          })

          const step = data.current_step || ''
          if (data.message && (step === 'done' || step === 'direct_reply')) {
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
            return prev.map((s, i) => i === activeIdx ? { ...s, label: data.label } : s)
          })
        },
        onPlan: async (plan: AgentPlan) => {
          hasPlanOrInquiryRef.current = true
          setCurrentPlan(plan)
          setTravelModeConfirmed(false)
          setStage('reviewing')
          const locMap = new Map<number, ResolvedLocation | null>()
          await Promise.all(
            plan.items.map(async (item: AgentPlanItem, i: number) => {
              try { locMap.set(i, await resolveLocation(item.location_table_name, item.location_id)) }
              catch { locMap.set(i, null) }
            })
          )
          setResolvedLocations(locMap)
          try {
            const res = await getAgentSessions()
            if (res.code === 0) {
              setSessions(res.data.list)
              if (res.data.list.length > 0 && !activeSessionId) setActiveSessionId(res.data.list[0].id)
            }
          } catch { /* non-critical */ }
        },
        onDone: () => {
          const now = Date.now()
          updateSteps((prev) => {
            const result = prev.map((s) =>
              s.status === 'active'
                ? { ...s, status: 'completed' as const, elapsed: Math.round((now - s.startedAt) / 100) / 10 }
                : s
            )
            if (result.length > 0 && (result[result.length - 1].elapsed ?? 0) < 0.1) result.pop()
            return result
          })
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
          setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'assistant', content: msg }])
        },
        onExceptions: (data: ExceptionEvent) => {
          setExceptions(data)
          if (data.warnings) setWarningsList(data.warnings)
        },
        onStage: (data: StageEvent) => setStage(data.stage),
        onExecuteResult: (data: ExecuteResult[]) => {
          setExecuteResults(data)
          setStage('executed')
        },
      }, controller.signal)
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setIsStreaming(false)
      updateSteps(() => [])
      toast.error('请求失败，请检查网络')
    }
  }

  // ── Action handlers ──
  const handleExecute = () => handleSend('确认')
  const handleOtherFeedback = (feedback: string) => handleSend(feedback)
  const handleShowTravelMode = () => setShowTravelModeSelector(true)
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

  // ── Render ──
  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden relative">
      <motion.div
        className="absolute inset-0 bg-slate-50/50"
        initial={{ opacity: 0 }}
        animate={ready ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />

      <div className="relative z-10 flex flex-col h-full">
        {/* Navbar */}
        <motion.nav
          className="border-b-2 border-emerald-400/60 bg-white/80 backdrop-blur-sm shrink-0"
          initial={{ y: -60, opacity: 0 }}
          animate={ready ? { y: 0, opacity: 1 } : { y: -60, opacity: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              disabled={isStreaming || executing}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft size={20} weight="bold" />
            </button>
            <span className="text-base font-medium text-slate-800 flex-1">AI 一键规划</span>
            <button
              onClick={() => navigate('/travel-plans')}
              disabled={isStreaming || executing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <User weight="bold" size={20} />
              <span className="text-sm font-medium">我的计划</span>
            </button>
          </div>
        </motion.nav>

        {/* Main content */}
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

          {/* Sidebar toggle */}
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

          {/* Chat area + input */}
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
            onClose={() => { setShowInquiryModal(false); setInquiryData(null) }}
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
                try { await updateTravelModes(planId, updatedItems.map((it) => it.travel_mode)) }
                catch { /* non-critical */ }
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
