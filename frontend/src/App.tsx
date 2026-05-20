import { useState, useEffect } from 'react'
import { Lobby } from './components/lobby'
import { ManualPlanPage } from './pages/ManualPlanPage'
import { AnimatePresence, motion } from 'framer-motion'
import './index.css'

type Page = 'lobby' | 'manual-plan'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('lobby')

  useEffect(() => {
    // 监听 hash 变化
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      if (hash === '/manual-plan') {
        setCurrentPage('manual-plan')
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

  return (
    <div className="h-[100dvh] overflow-hidden">
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
        ) : (
          <motion.div
            key="manual-plan"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <ManualPlanPage onBack={handleBack} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
