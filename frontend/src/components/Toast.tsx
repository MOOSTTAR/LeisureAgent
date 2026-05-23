'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, XCircle, X } from '@phosphor-icons/react'

interface ToastItem {
  id: number
  type: 'success' | 'error'
  message: string
}

let nextId = 0
let listeners: Array<() => void> = []
let pending: ToastItem[] = []

function notify() {
  listeners.forEach(fn => fn())
}

export const toast = {
  success(message: string) {
    const id = nextId++
    pending = [...pending, { id, type: 'success', message }]
    notify()
    setTimeout(() => {
      pending = pending.filter(t => t.id !== id)
      notify()
    }, 3000)
  },
  error(message: string) {
    const id = nextId++
    pending = [...pending, { id, type: 'error', message }]
    notify()
    setTimeout(() => {
      pending = pending.filter(t => t.id !== id)
      notify()
    }, 3000)
  },
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const sync = () => setToasts([...pending])
    listeners.push(sync)
    sync()
    return () => {
      listeners = listeners.filter(fn => fn !== sync)
    }
  }, [])

  const remove = (id: number) => {
    pending = pending.filter(t => t.id !== id)
    setToasts([...pending])
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(item => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg border text-sm font-medium ${
              item.type === 'success'
                ? 'bg-white border-emerald-200 text-emerald-700 shadow-emerald-100/50'
                : 'bg-white border-red-200 text-red-700 shadow-red-100/50'
            }`}
          >
            {item.type === 'success'
              ? <CheckCircle size={18} weight="fill" className="text-emerald-500 shrink-0" />
              : <XCircle size={18} weight="fill" className="text-red-500 shrink-0" />
            }
            <span>{item.message}</span>
            <button
              onClick={() => remove(item.id)}
              className="ml-1 p-0.5 rounded-md hover:bg-slate-100 transition-colors"
            >
              <X size={14} className="text-slate-400" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
