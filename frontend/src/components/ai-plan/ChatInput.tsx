import { useState } from 'react'
import { Spinner, PaperPlaneTilt } from '@phosphor-icons/react'

export function ChatInput({
  onSend,
  disabled,
  stage,
}: {
  onSend: (text: string) => void
  disabled: boolean
  stage: string
}) {
  const [input, setInput] = useState('')

  const handleSend = () => {
    const text = input.trim()
    if (!text || disabled) return
    setInput('')
    onSend(text)
  }

  const getPlaceholder = () => {
    switch (stage) {
      case 'reviewing':
        return '输入修改意见，如"换一家近的餐厅"，或输入"确认"执行预约...'
      case 'executed':
        return '预约已完成，方案已锁定。新建对话可重新规划'
      default:
        return '描述你的需求，如：下午带老婆孩子出去玩...'
    }
  }

  if (stage === 'executed') {
    return (
      <div className="border-t-2 border-emerald-400/60 bg-white/60 backdrop-blur-sm px-4 py-4">
        <div className="max-w-xl mx-auto text-center">
          <span className="text-sm text-slate-400">预约已完成，此会话已锁定</span>
        </div>
      </div>
    )
  }

  return (
    <div className="border-t-2 border-emerald-400/60 bg-white/60 backdrop-blur-sm px-4 py-4">
      <div className="max-w-xl mx-auto flex items-center gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={getPlaceholder()}
          className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-300 focus:bg-white transition-colors disabled:opacity-50"
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend()
          }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="p-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {disabled ? (
            <Spinner size={18} className="animate-spin" />
          ) : (
            <PaperPlaneTilt weight="fill" size={18} />
          )}
        </button>
      </div>
    </div>
  )
}
