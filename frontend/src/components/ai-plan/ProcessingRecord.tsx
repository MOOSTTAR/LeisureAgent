import { motion } from 'framer-motion'
import { Spinner, CheckCircle } from '@phosphor-icons/react'

export function ProcessingRecord({
  streamSteps,
  isStreaming,
}: {
  streamSteps: { label: string; status: 'active' | 'completed'; elapsed?: number }[]
  isStreaming: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center py-6 gap-3"
    >
      <div className="flex flex-col gap-1.5 px-4 py-3 bg-white rounded-2xl border border-indigo-200/40 shadow-sm min-w-[260px]">
        <div className="flex items-center gap-2 mb-1">
          {isStreaming ? (
            <Spinner size={14} className="text-indigo-500 animate-spin" />
          ) : (
            <CheckCircle size={14} weight="fill" className="text-emerald-400" />
          )}
          <span className="text-xs text-slate-400 font-medium">
            {isStreaming ? 'Agent 正在处理...' : '处理记录'}
          </span>
        </div>
        {streamSteps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex items-center gap-2 text-xs ${
              step.status === 'completed' ? 'text-slate-400' : 'text-slate-700 font-medium'
            }`}
          >
            {step.status === 'completed' ? (
              <CheckCircle size={12} weight="fill" className="text-emerald-400 shrink-0" />
            ) : (
              <Spinner size={12} className="text-indigo-500 animate-spin shrink-0" />
            )}
            <span className="flex-1">{step.label}</span>
            {step.elapsed != null && (
              <span className="text-[10px] text-slate-300 tabular-nums">{step.elapsed.toFixed(1)}s</span>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
