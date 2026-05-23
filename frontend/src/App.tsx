import { useState, useEffect, useRef, useCallback } from 'react'
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
import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion'
import { Sparkle } from '@phosphor-icons/react'
import { ToastContainer } from './components/Toast'
import './index.css'

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

type Page = 'lobby' | 'manual-plan' | 'restaurant' | 'park' | 'mall' | 'exhibition' | 'amusement' | 'travel-plans' | 'ai-plan' | 'shared-plan'
type ExpandPhase = 'idle' | 'dimming' | 'expanding' | 'pausing'

interface CardRect {
  left: number
  top: number
  width: number
  height: number
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('lobby')
  const [sharedPlanCode, setSharedPlanCode] = useState('')
  const prevHashRef = useRef('/')
  const [cardRect, setCardRect] = useState<CardRect | null>(null)
  const [expandPhase, setExpandPhase] = useState<ExpandPhase>('idle')
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const expandingDoneRef = useRef(false)

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  useEffect(() => {
    return () => clearTimers()
  }, [])

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || '/'
      if (hash !== '/travel-plans' && !hash.startsWith('/travel-plans/')) {
        prevHashRef.current = hash
      }
      if (hash.startsWith('/travel-plans/')) {
        const code = hash.slice('/travel-plans/'.length)
        if (code) {
          setSharedPlanCode(code)
          setCurrentPage('shared-plan')
          return
        }
      }
      if (hash === '/manual-plan') {
        setCurrentPage('manual-plan')
      } else if (hash === '/manual-plan/restaurant') {
        setCurrentPage('restaurant')
      } else if (hash === '/manual-plan/park') {
        setCurrentPage('park')
      } else if (hash === '/manual-plan/mall') {
        setCurrentPage('mall')
      } else if (hash === '/manual-plan/exhibition') {
        setCurrentPage('exhibition')
      } else if (hash === '/manual-plan/amusement') {
        setCurrentPage('amusement')
      } else if (hash === '/ai-plan') {
        setCurrentPage('ai-plan')
      } else if (hash === '/travel-plans') {
        setCurrentPage('travel-plans')
      } else {
        setCurrentPage('lobby')
      }
    }

    handleHashChange()

    window.addEventListener('hashchange', handleHashChange)
    window.addEventListener('popstate', handleHashChange)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
      window.removeEventListener('popstate', handleHashChange)
    }
  }, [])

  const backToLobby = () => {
    clearTimers()
    expandingDoneRef.current = false
    setExpandPhase('idle')
    setCardRect(null)
    window.location.hash = ''
    setCurrentPage('lobby')
  }

  const handleBack = () => backToLobby()
  const handleRestaurantBack = () => {
    window.location.hash = '/manual-plan'
    setCurrentPage('manual-plan')
  }
  const handleParkBack = () => {
    window.location.hash = '/manual-plan'
    setCurrentPage('manual-plan')
  }
  const handleMallBack = () => {
    window.location.hash = '/manual-plan'
    setCurrentPage('manual-plan')
  }
  const handleExhibitionBack = () => {
    window.location.hash = '/manual-plan'
    setCurrentPage('manual-plan')
  }
  const handleAmusementBack = () => {
    window.location.hash = '/manual-plan'
    setCurrentPage('manual-plan')
  }
  const handleAIPlanBack = () => backToLobby()
  const handleSharedPlanBack = () => backToLobby()

  const handleTravelPlansBack = () => {
    const prev = prevHashRef.current
    window.location.hash = prev
    if (prev === '/manual-plan') {
      setCurrentPage('manual-plan')
    } else if (prev === '/manual-plan/restaurant') {
      setCurrentPage('restaurant')
    } else if (prev === '/manual-plan/park') {
      setCurrentPage('park')
    } else if (prev === '/manual-plan/mall') {
      setCurrentPage('mall')
    } else if (prev === '/manual-plan/exhibition') {
      setCurrentPage('exhibition')
    } else if (prev === '/manual-plan/amusement') {
      setCurrentPage('amusement')
    } else {
      setCurrentPage('lobby')
    }
  }

  const handleNavigate = (page: string) => {
    if (page === 'travel-plans') {
      window.location.hash = '/travel-plans'
      setCurrentPage('travel-plans')
    }
  }

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
          window.location.hash = '/ai-plan'
        }, 320)

        timersRef.current.push(t2)
      }, 420)

      timersRef.current.push(t1)
    })
  }, [])

  const active = expandPhase !== 'idle'

  const overlayParams = cardRect
    ? (() => {
        return {
          w: cardRect.width,
          h: cardRect.height,
          left: cardRect.left,
          top: cardRect.top,
        }
      })()
    : null

  return (
    <div className="h-[100dvh]">
      <CursorCircle />
      <ToastContainer />

      {/* ====== 转场覆盖层 ====== */}
      <AnimatePresence>
        {active && cardRect && overlayParams && (
          <>
            {/* 拦截全部点击 — 动画期间屏蔽所有交互 */}
            <motion.div
              key="click-block"
              className="fixed inset-0 z-[101] pointer-events-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* 暗色遮罩 — 让周围消失 */}
            <motion.div
              key="dim-backdrop"
              className="fixed inset-0 z-[99] bg-black/50 backdrop-blur-sm pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } }}
              exit={{ opacity: 0, transition: { duration: 0.25 } }}
            />

            {/* 卡片外壳 — 用 width/height 膨胀，文字和图标不被拉伸 */}
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
              {/* 卡片内部内容 — 膨胀中和停顿中保持透明，避免白屏上出现拉伸内容 */}
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

      {/* ====== 页面切换 ====== */}
      <AnimatePresence mode="wait">
        {currentPage === 'lobby' ? (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={active
              ? { opacity: 0, transition: { duration: 0.25 } }
              : { opacity: 0, x: -50, transition: { duration: 0.3 } }
            }
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <Lobby onAICardClick={handleAICardClick} />
          </motion.div>
        ) : currentPage === 'manual-plan' ? (
          <motion.div
            key="manual-plan"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <ManualPlanPage onBack={handleBack} onNavigate={handleNavigate} />
          </motion.div>
        ) : currentPage === 'restaurant' ? (
          <motion.div
            key="restaurant"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <RestaurantPage onBack={handleRestaurantBack} />
          </motion.div>
        ) : currentPage === 'park' ? (
          <motion.div
            key="park"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <ParkPage onBack={handleParkBack} />
          </motion.div>
        ) : currentPage === 'exhibition' ? (
          <motion.div
            key="exhibition"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <ExhibitionPage onBack={handleExhibitionBack} />
          </motion.div>
        ) : currentPage === 'amusement' ? (
          <motion.div
            key="amusement"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <AmusementParkPage onBack={handleAmusementBack} />
          </motion.div>
        ) : currentPage === 'mall' ? (
          <motion.div
            key="mall"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <MallPage onBack={handleMallBack} />
          </motion.div>
        ) : currentPage === 'ai-plan' ? (
          <motion.div
            key="ai-plan"
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <AIPlanPage onBack={handleAIPlanBack} />
          </motion.div>
        ) : currentPage === 'travel-plans' ? (
          <motion.div
            key="travel-plans"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <TravelPlanPage onBack={handleTravelPlansBack} />
          </motion.div>
        ) : currentPage === 'shared-plan' ? (
          <motion.div
            key="shared-plan"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <SharedPlanPage shareCode={sharedPlanCode} onBack={handleSharedPlanBack} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default App
