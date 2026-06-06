import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle } from '@phosphor-icons/react'
import type { InquiryEvent } from '../../api'

export function InquiryModal({
  data,
  onClose,
  onAddToPlan,
  onOther,
}: {
  data: InquiryEvent
  onClose: () => void
  onAddToPlan: (itemNames: string[]) => void
  onOther: (feedback: string) => void
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [otherText, setOtherText] = useState('')

  const toggleItem = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAddSelected = () => {
    const names = data.items.filter((item) => selected.has(item.id)).map((item) => item.name)
    if (names.length > 0) onAddToPlan(names)
  }

  const handleAddAll = () => {
    onAddToPlan(data.items.map((item) => item.name))
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <motion.div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-w-lg w-full mx-0 sm:mx-4 max-h-[70vh] overflow-hidden flex flex-col"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">查询结果</h3>
          <p className="text-xs text-slate-500 mt-0.5">{data.message}</p>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {data.items.map((item) => {
            const isSelected = selected.has(item.id)
            return (
              <div
                key={`${item.category}-${item.id}`}
                onClick={() => toggleItem(item.id)}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  isSelected ? 'border-blue-300 bg-blue-50' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                }`}>
                  {isSelected && <CheckCircle size={14} weight="fill" className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 truncate">{item.name}</span>
                    {!item.available && (
                      <span className="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded">已满</span>
                    )}
                    {item.can_book && item.available && (
                      <span className="text-xs text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded">需要预约</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {item.address} · {item.distance}m
                    {item.queue_time && item.queue_time > 0 ? ` · 排队约${item.queue_time}分钟` : ''}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Actions — Yes/No/Other */}
        <div className="px-5 py-3 border-t border-slate-100 space-y-2">
          <button
            onClick={selected.size > 0 ? handleAddSelected : handleAddAll}
            className="w-full py-2.5 text-sm font-semibold text-white bg-blue-500 rounded-xl hover:bg-blue-600 active:scale-[0.98] transition-all"
          >
            {selected.size > 0 ? `添加选中 (${selected.size})` : '全部添加'} (Yes)
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 text-sm text-slate-500 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
          >
            不要了 (No)
          </button>
          <div className="flex items-center gap-2">
            <input
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="Other — 输入其他需求..."
              className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-300 focus:bg-white transition-colors placeholder:text-slate-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && otherText.trim()) {
                  onOther(otherText.trim())
                  setOtherText('')
                }
              }}
            />
            <button
              onClick={() => {
                if (otherText.trim()) {
                  onOther(otherText.trim())
                  setOtherText('')
                }
              }}
              disabled={!otherText.trim()}
              className="shrink-0 px-4 py-2 bg-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              提交
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
