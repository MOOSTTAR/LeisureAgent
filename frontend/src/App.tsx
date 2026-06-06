import { useState, useEffect, useRef, useCallback } from 'react'
import { HashRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion'
import { Sparkle } from '@phosphor-icons/react'
import { ToastContainer } from './components/Toast'
import { Lobby } from './components/lobby'
import { ManualPlanPage } from './pages/ManualPlanPage'
import { RestaurantPage } from './pages/RestaurantPage'
import { ParkPage } from './pages/ParkPage'
import { MallPage } from './pages/MallPage'
import { ExhibitionPage } from './pages/ExhibitionPage'
import { AmusementParkPage } from './pages/AmusementParkPage'
import { TravelPlanPage } from './pages/TravelPlanPage'
import { AIPlanPage } from './pages/AIPlanPage'
import { SharedPlanPage } from './pages/SharedPlanPage'
import './index.css'

// ── CursorCircle ──────────────────────────────────────────────

function CursorCircle() {
  const mouseX = useMotionValue(-100)
  const mouseY = useMotionValue(-100)
  const springX = useSpring(mouseX, { stiffness: 150, damping: 15 })
  const springY = useSpring(mouseY, { stiffness: 150, damping: 15 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  return (
    <motion.div
      className="fixed top-0 left-0 w-8 h-8 rounded-full border-2 border-pink-400/60 pointer-events-none z-[110] -translate-x-1/2 -translate-y-1/2"
      style={{ x: springX, y: springY }}
    />
  )
}

// ── Types ─────────────────────────────────────────────────────

type ExpandPhase = 'idle' | 'dimming' | 'expanding' | 'pausing'

interface CardRect {
  left: number
  top: number
  width: number
  height: number
}

// ── Page wrapper with consistent motion ───────────────────────

const pageMotion = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
  transition: { duration: 0.3 },
}

function PageWrapper({ children, className = 'h-full' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div {...pageMotion} className={className}>
      {children}
    </motion.div>
  )
}

// ── AppContent (lives inside HashRouter) ───────────────────────

function AppContent() {
  const navigate = useNavigate()
  const [cardRect, setCardRect] = useState<CardRect | null>(null)
  const [expandPhase, setExpandPhase] = useState<ExpandPhase>('idle')
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const expandingDoneRef = useRef(false)

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  useEffect(() => {
    return () => clearTimers()
  }, [clearTimers])

  const handleAICardClick = useCallback((rect: DOMRect) => {
    clearTimers()
    expandingDoneRef.current = false
    setCardRect({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    })

    requestAnimationFrame(() => {
      setExpandPhase('dimming')

      const t1 = setTimeout(() => {
        setExpandPhase('expanding')

        // 卡片放大到 ~65% 时切到 AI 页面
        const t2 = setTimeout(() => {
          navigate('/ai-plan')
        }, 320)

        timersRef.current.push(t2)
      }, 420)

      timersRef.current.push(t1)
    })
  }, [navigate, clearTimers])

  const active = expandPhase !== 'idle'

  const overlayParams = cardRect
    ? { w: cardRect.width, h: cardRect.height, left: cardRect.left, top: cardRect.top }
    : null

  return (
    <div className="h-[100dvh]">
      <CursorCircle />
      <ToastContainer />

      {/* ====== 转场覆盖层 ====== */}
      <AnimatePresence>
        {active && cardRect && overlayParams && (
          <>
            {/* 拦截全部点击 */}
            <motion.div
              key="click-block"
              className="fixed inset-0 z-[101] pointer-events-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* 暗色遮罩 */}
            <motion.div
              key="dim-backdrop"
              className="fixed inset-0 z-[99] bg-black/50 backdrop-blur-sm pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } }}
              exit={{ opacity: 0, transition: { duration: 0.25 } }}
            />

            {/* 卡片外壳 */}
            <motion.div
              key="card-shell"
              className="fixed z-[100] pointer-events-none bg-white shadow-[0_8px_30px_-6px_rgba(0,0,0,0.15)]"
              style={{
                left: overlayParams.left,
                top: overlayParams.top,
                width: overlayParams.w,
                height: overlayParams.h,
              }}
              initial={{ left: overlayParams.left, top: overlayParams.top, width: overlayParams.w, height: overlayParams.h, borderRadius: 40, opacity: 1 }}
              animate={
                expandPhase === 'dimming'
                  ? { left: overlayParams.left, top: overlayParams.top, width: overlayParams.w, height: overlayParams.h, opacity: 1, borderRadius: 40, transition: { duration: 0.35, ease: 'easeOut' } }
                  : expandPhase === 'expanding'
                    ? {
                        left: 0,
                        top: 0,
                        width: window.innerWidth,
                        height: window.innerHeight,
                        borderRadius: 0,
                        opacity: 1,
                        transition: { duration: 0.55, ease: [0.22, 0.61, 0.36, 1] },
                      }
                    : expandPhase === 'pausing'
                      ? {
                          left: 0,
                          top: 0,
                          width: window.innerWidth,
                          height: window.innerHeight,
                          borderRadius: 0,
                          opacity: 1,
                        }
                      : {}
              }
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
              onAnimationComplete={() => {
                if (expandPhase === 'expanding' && !expandingDoneRef.current) {
                  expandingDoneRef.current = true
                  setExpandPhase('pausing')
                  const t3 = setTimeout(() => {
                    setExpandPhase('idle')
                    setCardRect(null)
                  }, 150)
                  timersRef.current.push(t3)
                }
              }}
            >
              {/* 卡片内部内容 */}
              <motion.div
                className="w-full h-full overflow-hidden"
                animate={
                  expandPhase === 'expanding' || expandPhase === 'pausing'
                    ? { opacity: 0, transition: { duration: 0.3, delay: 0.1, ease: 'easeOut' } }
                    : { opacity: 1 }
                }
              >
                <div className="p-10 md:p-12 flex flex-col h-full">
                  <div className="mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200/50 flex items-center justify-center text-emerald-600">
                      <Sparkle weight="fill" size={32} />
                    </div>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-medium tracking-tight text-slate-900 mb-3">
                    AI 一键规划
                  </h3>
                  <p className="text-base text-slate-500 leading-relaxed mb-8">
                    用自然语言描述你的需求，AI 智能体自动规划完整活动方案。
                  </p>
                  <div className="mt-auto flex items-center gap-3 text-emerald-600 font-medium">
                    <span className="text-sm">开始规划</span>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(600px circle at 50% 50%, rgba(16, 185, 129, 0.06), transparent 40%)',
                  }}
                />
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ====== 路由 ====== */}
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={
            active
              ? <PageWrapper><Lobby onAICardClick={handleAICardClick} /></PageWrapper>
              : <PageWrapper><Lobby onAICardClick={handleAICardClick} /></PageWrapper>
          } />
          <Route path="/manual-plan" element={<PageWrapper><ManualPlanPage /></PageWrapper>} />
          <Route path="/manual-plan/restaurant" element={<PageWrapper><RestaurantPage /></PageWrapper>} />
          <Route path="/manual-plan/park" element={<PageWrapper><ParkPage /></PageWrapper>} />
          <Route path="/manual-plan/mall" element={<PageWrapper><MallPage /></PageWrapper>} />
          <Route path="/manual-plan/exhibition" element={<PageWrapper><ExhibitionPage /></PageWrapper>} />
          <Route path="/manual-plan/amusement" element={<PageWrapper><AmusementParkPage /></PageWrapper>} />
          <Route path="/ai-plan" element={<PageWrapper><AIPlanPage /></PageWrapper>} />
          <Route path="/travel-plans" element={<PageWrapper><TravelPlanPage /></PageWrapper>} />
          <Route path="/travel-plans/:shareCode" element={<PageWrapper><SharedPlanPageWrapper /></PageWrapper>} />
        </Routes>
      </AnimatePresence>
    </div>
  )
}

// ── SharedPlanPage wrapper (reads :shareCode from URL params) ──

function SharedPlanPageWrapper() {
  const { shareCode } = useParams<{ shareCode: string }>()
  const navigate = useNavigate()
  return <SharedPlanPage shareCode={shareCode || ''} onBack={() => navigate('/')} />
}

// ── App root ───────────────────────────────────────────────────

function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  )
}

export default App
