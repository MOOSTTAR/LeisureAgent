import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react'
import { motion } from 'framer-motion'
import { MessageBubble } from './MessageBubble'
import { ProcessingRecord } from './ProcessingRecord'
import { PlanView } from './PlanView'
import type { ChatMessage } from './types'
import type { AgentPlan, ExecuteResult, ExceptionEvent, ResolvedLocation } from '../../api'

export function ChatArea({
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
              <Fragment key={msg.id}>
                <MessageBubble
                  message={msg}
                  scrollDirection={scrollDirection}
                  scrollVelocity={scrollVelocity}
                />
                {msg.role === 'user' && (
                  (() => {
                    const steps = stepHistory.get(i)
                    if (!steps || steps.length === 0) return null
                    const isActive = isStreaming && i === activeUserMsgIdx
                    return <ProcessingRecord streamSteps={steps} isStreaming={isActive} />
                  })()
                )}
              </Fragment>
            ))}

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
