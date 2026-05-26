'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { X, PersonSimpleWalk, Bicycle, Car, Train } from '@phosphor-icons/react'
import type { AgentPlanItem } from '../api'

const TRAVEL_SPEEDS: Record<string, number> = {
  walking: 80, biking: 250, driving: 500, subway: 600,
}

function calcDistanceBetween(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2)
}

function estimateTravelTime(dist: number, mode: string): number {
  if (!mode || !TRAVEL_SPEEDS[mode]) return 0
  let mins = dist / TRAVEL_SPEEDS[mode]
  if (mode === 'subway') mins += 10
  return Math.max(1, Math.round(mins))
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${nh}:${nm.toString().padStart(2, '0')}`
}

const MODE_OPTIONS = [
  { key: 'walking', label: '步行', icon: PersonSimpleWalk, speed: '5 km/h' },
  { key: 'biking', label: '骑车', icon: Bicycle, speed: '15 km/h' },
  { key: 'driving', label: '开车', icon: Car, speed: '30 km/h' },
  { key: 'subway', label: '地铁', icon: Train, speed: '36 km/h' },
]

interface ResolvedLocation {
  name: string
  x: number
  y: number
}

interface Segment {
  from: ResolvedLocation
  to: ResolvedLocation
  dist: number
  toIdx: number       // item index this segment leads to
  isOrigin: boolean   // true = from 起点(0,0)
  dayLabel: string
}

interface TravelModeSelectorProps {
  items: AgentPlanItem[]
  locations: Map<number, ResolvedLocation | null>
  onConfirm: (updatedItems: AgentPlanItem[]) => void
  onClose: () => void
  onOther: (feedback: string) => void
}

export function TravelModeSelector({ items, locations, onConfirm, onClose, onOther }: TravelModeSelectorProps) {
  // Group items by day
  const dayGroups = useMemo(() => {
    const groups: { label: string; indices: number[] }[] = []
    for (let i = 0; i < items.length; i++) {
      const label = items[i].day_label || `第${items[i].day_num || 1}天`
      const last = groups[groups.length - 1]
      if (last && last.label === label) {
        last.indices.push(i)
      } else {
        groups.push({ label, indices: [i] })
      }
    }
    return groups
  }, [items])

  // Build segments: each day starts with 起点→first, then items within day connect sequentially
  const segments = useMemo(() => {
    const segs: Segment[] = []
    for (const group of dayGroups) {
      const indices = group.indices
      // Origin → first item of day
      const firstLoc = locations.get(indices[0])
      if (firstLoc) {
        const dist = calcDistanceBetween(0, 0, firstLoc.x, firstLoc.y)
        segs.push({
          from: { name: '起点(家)', x: 0, y: 0 },
          to: firstLoc,
          dist,
          toIdx: indices[0],
          isOrigin: true,
          dayLabel: group.label,
        })
      }
      // Between consecutive items in same day
      for (let j = 1; j < indices.length; j++) {
        const fromLoc = locations.get(indices[j - 1])
        const toLoc = locations.get(indices[j])
        if (fromLoc && toLoc) {
          const dist = calcDistanceBetween(fromLoc.x, fromLoc.y, toLoc.x, toLoc.y)
          segs.push({
            from: fromLoc,
            to: toLoc,
            dist,
            toIdx: indices[j],
            isOrigin: false,
            dayLabel: group.label,
          })
        }
      }
    }
    return segs
  }, [dayGroups, locations])

  const [otherText, setOtherText] = useState('')

  // Mode keyed by toIdx, plus "origin_N" for origin segments
  const [modes, setModes] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const seg of segments) {
      const key = seg.isOrigin ? `origin_${seg.toIdx}` : String(seg.toIdx)
      init[key] = items[seg.toIdx].travel_mode || 'walking'
    }
    return init
  })

  // Recalculate times based on selected modes
  const previewItems = useMemo(() => {
    const result = items.map((it) => ({ ...it }))
    for (const seg of segments) {
      const key = seg.isOrigin ? `origin_${seg.toIdx}` : String(seg.toIdx)
      const mode = modes[key] || 'walking'
      const travelMin = estimateTravelTime(seg.dist, mode)

      if (seg.isOrigin) {
        // Travel from origin → first item: affects this item's arrive_time
        const item = result[seg.toIdx]
        const newArrive = addMinutes('10:00', travelMin)
        result[seg.toIdx] = {
          ...item,
          arrive_time: item.arrive_time || newArrive,
          leave_time: addMinutes(item.arrive_time || newArrive, item.stay_minute),
          travel_mode: mode,
        }
      } else {
        // Travel from previous item → this item
        const prevItem = result[seg.toIdx - 1]
        const thisItem = result[seg.toIdx]
        const newArrive = addMinutes(prevItem.leave_time, travelMin)
        result[seg.toIdx] = {
          ...thisItem,
          arrive_time: newArrive,
          leave_time: addMinutes(newArrive, thisItem.stay_minute),
          travel_mode: mode,
        }
      }
    }
    return result
  }, [items, segments, modes])

  const handleConfirm = () => {
    onConfirm(previewItems)
  }

  // Group segments by day for display
  const daySegments = useMemo(() => {
    const groups: { label: string; segments: Segment[] }[] = []
    for (const seg of segments) {
      const last = groups[groups.length - 1]
      if (last && last.label === seg.dayLabel) {
        last.segments.push(seg)
      } else {
        groups.push({ label: seg.dayLabel, segments: [seg] })
      }
    }
    return groups
  }, [segments])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">选择出行方式</h3>
            <p className="text-xs text-slate-500 mt-0.5">选择每段行程的交通方式，时间将自动更新</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Body — grouped by day */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5" style={{ minHeight: 0 }}>
          {daySegments.map((dayGroup, dgIdx) => (
            <div key={dgIdx}>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-600">
                  {dayGroup.label}
                </span>
                <div className="flex-1 h-px bg-indigo-100" />
              </div>
              <div className="space-y-3">
                {dayGroup.segments.map((seg, idx) => {
                  const key = seg.isOrigin ? `origin_${seg.toIdx}` : String(seg.toIdx)
                  const currentMode = modes[key] || 'walking'
                  const itemIdx = seg.toIdx
                  return (
                    <div key={key} className="bg-slate-50 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`font-medium ${seg.isOrigin ? 'text-slate-400' : 'text-slate-700'}`}>
                          {seg.from.name}
                        </span>
                        <span className="text-slate-300">→</span>
                        <span className="font-medium text-slate-700">{seg.to.name}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {seg.isOrigin ? '从家出发' : '上段行程结束后'} · 距离约 {seg.dist} 米
                      </p>

                      <div className="grid grid-cols-4 gap-2">
                        {MODE_OPTIONS.map((opt) => {
                          const travelMin = estimateTravelTime(seg.dist, opt.key)
                          const isSelected = currentMode === opt.key
                          const Icon = opt.icon
                          return (
                            <button
                              key={opt.key}
                              onClick={() => setModes((prev) => ({ ...prev, [key]: opt.key }))}
                              className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg border text-xs transition-all ${
                                isSelected
                                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              <Icon size={20} weight={isSelected ? 'fill' : 'regular'} />
                              <span className="font-medium">{opt.label}</span>
                              <span className="text-[10px] opacity-70">{travelMin} 分钟</span>
                            </button>
                          )
                        })}
                      </div>

                      {/* Preview arrival time */}
                      <p className="text-xs text-slate-400">
                        {seg.isOrigin ? '出发' : '预计到达'}：
                        {seg.isOrigin
                          ? `${addMinutes('10:00', estimateTravelTime(seg.dist, currentMode))} 到达`
                          : `${previewItems[itemIdx]?.arrive_time || items[itemIdx].arrive_time} 到达`
                        }
                        {' → '}离开：{previewItems[itemIdx]?.leave_time || items[itemIdx].leave_time}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer — Yes/No/Other */}
        <div className="px-5 py-4 border-t border-slate-100 space-y-2">
          <button
            onClick={handleConfirm}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 active:scale-[0.98] transition-all"
          >
            确认出行方式 (Yes)
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl text-sm text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            取消 (No)
          </button>
          <div className="flex items-center gap-2">
            <input
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="Other — 输入其他想法..."
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
