import { useState, useEffect } from 'react'
import { Lobby } from './components/lobby'
import { ManualPlanPage } from './pages/ManualPlanPage'
import { RestaurantPage } from './pages/RestaurantPage'
import { ParkPage } from './pages/ParkPage'
import { MallPage } from './pages/MallPage'
import { ExhibitionPage } from './pages/ExhibitionPage'
import { AmusementParkPage } from './pages/AmusementParkPage'
import { TravelPlanPage } from './pages/TravelPlanPage'
import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion'
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
      className="fixed top-0 left-0 w-8 h-8 rounded-full border-2 border-pink-400/60 pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2"
      style={{ x: springX, y: springY }}
    />
  )
}

type Page = 'lobby' | 'manual-plan' | 'restaurant' | 'park' | 'mall' | 'exhibition' | 'amusement' | 'travel-plans'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('lobby')

  useEffect(() => {
    // 监听 hash 变化
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
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
      } else if (hash === '/travel-plans') {
        setCurrentPage('travel-plans')
      } else {
        setCurrentPage('lobby')
      }
    }

    // 初始化
    handleHashChange()

    // 监听 hashchange 事件
    window.addEventListener('hashchange', handleHashChange)
    // 监听 popstate 事件（浏览器前进/后退）
    window.addEventListener('popstate', handleHashChange)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
      window.removeEventListener('popstate', handleHashChange)
    }
  }, [])

  const handleBack = () => {
    window.location.hash = ''
    setCurrentPage('lobby')
  }

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

  const handleTravelPlansBack = () => {
    window.location.hash = '/manual-plan'
    setCurrentPage('manual-plan')
  }

  const handleNavigate = (page: string) => {
    if (page === 'travel-plans') {
      window.location.hash = '/travel-plans'
      setCurrentPage('travel-plans')
    }
  }

  return (
    <div className="h-[100dvh]">
      <CursorCircle />
      <AnimatePresence mode="wait">
        {currentPage === 'lobby' ? (
          <motion.div
            key="lobby"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <Lobby />
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
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default App
