'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CaretDown } from '@phosphor-icons/react'

export interface SelectOption {
  value: string
  label: string
}

type Theme = 'orange' | 'emerald' | 'pink' | 'violet' | 'amber'

const THEME_COLORS: Record<Theme, { border: string; ring: string; hover: string; caret: string; bg: string; text: string; panelBorder: string }> = {
  orange:   { border: 'border-orange-400', ring: 'ring-orange-400/20', hover: 'hover:border-orange-300', caret: 'text-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', panelBorder: 'border-orange-100' },
  emerald:  { border: 'border-emerald-400', ring: 'ring-emerald-400/20', hover: 'hover:border-emerald-300', caret: 'text-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', panelBorder: 'border-emerald-100' },
  pink:     { border: 'border-pink-400', ring: 'ring-pink-400/20', hover: 'hover:border-pink-300', caret: 'text-pink-500', bg: 'bg-pink-50', text: 'text-pink-700', panelBorder: 'border-pink-100' },
  violet:   { border: 'border-violet-400', ring: 'ring-violet-400/20', hover: 'hover:border-violet-300', caret: 'text-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', panelBorder: 'border-violet-100' },
  amber:    { border: 'border-amber-400', ring: 'ring-amber-400/20', hover: 'hover:border-amber-300', caret: 'text-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', panelBorder: 'border-amber-100' },
}

interface CustomSelectProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  theme: Theme
  placeholder?: string
}

export function CustomSelect({ value, options, onChange, theme, placeholder }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const t = THEME_COLORS[theme]

  const selectedLabel = value
    ? (options.find(opt => opt.value === value)?.label || placeholder || '全部')
    : (placeholder || '全部')

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-2 bg-white border-2 rounded-xl text-sm font-medium transition-all cursor-pointer min-w-[100px] flex items-center gap-2 ${
          isOpen
            ? `${t.border} ring-2 ${t.ring}`
            : `border-slate-200 ${t.hover}`
        }`}
      >
        <span className={value ? 'text-slate-700' : 'text-slate-400'}>{selectedLabel}</span>
        <CaretDown
          size={16}
          className={`transition-transform ${isOpen ? `rotate-180 ${t.caret}` : 'text-slate-400'}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-full left-0 mt-1.5 bg-white rounded-xl border ${t.panelBorder} shadow-[0_8px_24px_-8px_rgba(0,0,0,0.15)] py-1 z-50 min-w-[120px]`}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  value === option.value
                    ? `${t.bg} ${t.text} font-medium`
                    : 'text-slate-600 hover:bg-slate-50'
                } first:rounded-t-xl last:rounded-b-xl`}
              >
                {option.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
