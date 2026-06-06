import { motion } from 'framer-motion'
import { Plus, Trash } from '@phosphor-icons/react'
import type { AgentSession } from '../../api'

export function ConversationSidebar({
  isOpen,
  sessions,
  activeId,
  isLoading,
  disabled,
  onSelect,
  onDelete,
  onNew,
}: {
  isOpen: boolean
  sessions: AgentSession[]
  activeId: number | null
  isLoading: boolean
  disabled: boolean
  onSelect: (id: number) => void
  onDelete: (id: number) => void
  onNew: () => void
}) {
  return (
    <motion.div
      className="h-full border-r-2 border-emerald-400/60 bg-white/60 backdrop-blur-sm flex flex-col shrink-0 overflow-hidden"
      animate={{ width: isOpen ? 260 : 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      <div className="w-[260px] flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-3 border-b border-slate-100">
          <span className="text-sm font-medium text-slate-500">
            {isLoading ? '加载中...' : `${sessions.length} 个会话`}
          </span>
          <button
            onClick={onNew}
            disabled={disabled}
            className="flex items-center gap-1 text-sm text-white bg-blue-500 hover:bg-blue-600 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
          >
            <Plus size={14} weight="bold" />
            新对话
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 && !isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 select-none">
              暂无历史会话
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => { if (!disabled) onSelect(s.id) }}
                className={`group flex items-center gap-2 px-3 py-2.5 mx-2 mt-1 rounded-lg transition-colors ${
                  disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                } ${
                  activeId === s.id
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="flex-1 text-sm truncate">{s.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!disabled) onDelete(s.id)
                  }}
                  disabled={disabled}
                  className={`hidden group-hover:flex p-1.5 rounded transition-colors disabled:!hidden ${
                    activeId === s.id
                      ? 'text-white/70 hover:text-white hover:bg-white/20'
                      : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                  }`}
                >
                  <Trash size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  )
}
