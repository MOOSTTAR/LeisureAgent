'use client'

import { useMemo, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { X, Plus, Minus } from '@phosphor-icons/react'

interface MapPoint {
  name: string
  x: number
  y: number
  arriveTime: string
  leaveTime: string
  theme: string
  typeLabel: string
  dayNum: number
  dayLabel: string
}

const THEME_COLORS: Record<string, string> = {
  orange: '#f97316',
  emerald: '#10b981',
  pink: '#ec4899',
  violet: '#8b5cf6',
  amber: '#f59e0b',
}

const LEGEND: Array<{ theme: string; label: string }> = [
  { theme: 'orange', label: '餐厅' },
  { theme: 'emerald', label: '景点' },
  { theme: 'pink', label: '商场' },
  { theme: 'violet', label: '展馆' },
  { theme: 'amber', label: '乐园' },
]

const DAY_LABELS: Record<number, string> = { 1: '第一天', 2: '第二天', 3: '第三天' }

const MIN_SCALE = 0.3
const MAX_SCALE = 3.0

// Tick spacing for axes — stepped by magnitude
function axisTickStep(range: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(range)))
  const r = range / mag
  if (r <= 2) return mag / 5
  if (r <= 5) return mag / 2
  return mag
}

interface PlanMapViewProps {
  points: MapPoint[]
  onClose: () => void
}

export function PlanMapView({ points, onClose }: PlanMapViewProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const draggingRef = useRef<{ startX: number; startY: number; startOx: number; startOy: number } | null>(null)

  const availableDays = useMemo(() => {
    const map = new Map<number, string>()
    for (const p of points) {
      const d = p.dayNum || 1
      if (!map.has(d)) map.set(d, p.dayLabel || DAY_LABELS[d] || `第${d}天`)
    }
    return [...map.entries()].sort(([a], [b]) => a - b)
  }, [points])

  const [activeDay, setActiveDay] = useState(availableDays[0] || 1)

  const handleDaySwitch = useCallback((day: number) => {
    setActiveDay(day)
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  const dayPoints = useMemo(() => points.filter((p) => (p.dayNum || 1) === activeDay), [points, activeDay])

  const { initialViewBox, allPoints } = useMemo(() => {
    if (dayPoints.length === 0) return { initialViewBox: { x: -200, y: -150, w: 400, h: 300 }, allPoints: [] }

    const allX = [0, ...dayPoints.map((p) => p.x)]
    const allY = [0, ...dayPoints.map((p) => p.y)]
    const minX = Math.min(...allX)
    const maxX = Math.max(...allX)
    const minY = Math.min(...allY)
    const maxY = Math.max(...allY)
    const padX = Math.max((maxX - minX) * 0.2, 150)
    const padY = Math.max((maxY - minY) * 0.2, 150)

    const allPoints: Array<MapPoint & { isOrigin?: boolean }> = [
      { name: '起点', x: 0, y: 0, arriveTime: '', leaveTime: '', theme: 'slate', typeLabel: '', dayNum: 0, dayLabel: '' },
      ...dayPoints,
    ]

    return {
      initialViewBox: { x: minX - padX, y: minY - padY, w: maxX - minX + padX * 2, h: maxY - minY + padY * 2 },
      allPoints,
    }
  }, [dayPoints])

  // Axis ticks
  const axisTicks = useMemo(() => {
    const vb = initialViewBox
    const xRange = vb.w
    const yRange = vb.h
    const xStep = axisTickStep(xRange)
    const yStep = axisTickStep(yRange)

    const xTicks: number[] = []
    const xStart = Math.floor(vb.x / xStep) * xStep
    for (let v = xStart; v <= vb.x + vb.w; v += xStep) {
      if (Math.abs(v) > xStep * 0.01) xTicks.push(Math.round(v))
    }

    const yTicks: number[] = []
    const yStart = Math.floor(vb.y / yStep) * yStep
    for (let v = yStart; v <= vb.y + vb.h; v += yStep) {
      if (Math.abs(v) > yStep * 0.01) yTicks.push(Math.round(v))
    }

    return { xTicks, yTicks, xStep, yStep }
  }, [initialViewBox])

  const viewBox = useMemo(() => {
    const s = 1 / scale
    return `${initialViewBox.x + offset.x * s} ${initialViewBox.y + offset.y * s} ${initialViewBox.w * s} ${initialViewBox.h * s}`
  }, [initialViewBox, scale, offset])

  const getSvgScale = useCallback(() => {
    const el = svgRef.current
    if (!el) return 1
    return el.clientWidth / initialViewBox.w
  }, [initialViewBox.w])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    draggingRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOx: offset.x,
      startOy: offset.y,
    }
  }, [offset])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingRef.current) return
    const svgScale = getSvgScale()
    const dx = (e.clientX - draggingRef.current.startX) / svgScale
    const dy = (e.clientY - draggingRef.current.startY) / svgScale
    setOffset({
      x: draggingRef.current.startOx - dx,
      y: draggingRef.current.startOy - dy,
    })
  }, [getSvgScale])

  const handleMouseUp = useCallback(() => { draggingRef.current = null }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const el = svgRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()

    const svgScale = el.clientWidth / initialViewBox.w
    const mouseSvgX = (e.clientX - rect.left) / svgScale
    const mouseSvgY = (e.clientY - rect.top) / svgScale

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * zoomFactor))

    const sOld = 1 / scale
    const sNew = 1 / newScale
    const worldX = initialViewBox.x + offset.x * sOld + mouseSvgX * sOld
    const worldY = initialViewBox.y + offset.y * sOld + mouseSvgY * sOld

    setOffset({
      x: (worldX - initialViewBox.x - mouseSvgX * sNew) / sNew,
      y: (worldY - initialViewBox.y - mouseSvgY * sNew) / sNew,
    })
    setScale(newScale)
  }, [scale, initialViewBox, offset])

  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, s * 1.3))
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, s / 1.3))
  const resetView = () => { setScale(1); setOffset({ x: 0, y: 0 }) }

  const isMultiDay = availableDays.length > 1
  const AXIS_EXTENT = 50000

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">行程地图总览</h3>
            <p className="text-xs text-slate-500 mt-0.5">拖拽平移 · 滚轮缩放 · 十字坐标轴</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={zoomIn} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500" title="放大">
              <Plus size={18} weight="bold" />
            </button>
            <button onClick={zoomOut} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500" title="缩小">
              <Minus size={18} weight="bold" />
            </button>
            <button onClick={resetView} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 text-xs font-bold" title="重置">
              1:1
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors ml-2">
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Day Tabs */}
        {isMultiDay && (
          <div className="flex items-center gap-1 px-5 py-2 border-b border-slate-100 bg-slate-50">
            {availableDays.map(([day, label]) => (
              <button
                key={day}
                onClick={() => handleDaySwitch(day)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeDay === day
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {label}（{points.filter((p) => (p.dayNum || 1) === day).length}个地点）
              </button>
            ))}
          </div>
        )}

        {/* Map */}
        <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          <svg
            ref={svgRef}
            viewBox={viewBox}
            className="w-full h-full cursor-grab active:cursor-grabbing select-none"
            style={{ minHeight: 350 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            {/* Grid */}
            <defs>
              <pattern id="grid" width="200" height="200" patternUnits="userSpaceOnUse">
                <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect x={-5000} y={-5000} width={10000} height={10000} fill="url(#grid)" />

            {/* ── Crosshair Axes ── */}
            {/* X axis */}
            <line x1={-AXIS_EXTENT} y1={0} x2={AXIS_EXTENT} y2={0}
              stroke="#475569" strokeWidth={2.5} />
            {/* Y axis */}
            <line x1={0} y1={-AXIS_EXTENT} x2={0} y2={AXIS_EXTENT}
              stroke="#475569" strokeWidth={2.5} />

            {/* Arrow heads */}
            <polygon points={`${AXIS_EXTENT - 40},-12 ${AXIS_EXTENT},0 ${AXIS_EXTENT - 40},12`} fill="#475569" />
            <polygon points={`-12,${-AXIS_EXTENT + 40} 0,${-AXIS_EXTENT} 12,${-AXIS_EXTENT + 40}`} fill="#475569" />

            {/* Origin circle */}
            <circle cx={0} cy={0} r={8} fill="#475569" stroke="white" strokeWidth={2.5} />

            {/* Axis labels */}
            <text x={AXIS_EXTENT - 20} y={-24} textAnchor="middle" fontSize={18} fontWeight={700} fill="#475569">X</text>
            <text x={22} y={-AXIS_EXTENT + 20} textAnchor="start" fontSize={18} fontWeight={700} fill="#475569">Y</text>
            <text x={-16} y={16} textAnchor="end" fontSize={14} fontWeight={600} fill="#64748b">O</text>

            {/* X-axis ticks */}
            {axisTicks.xTicks.map((v) => (
              <g key={`xt-${v}`}>
                <line x1={v} y1={-8} x2={v} y2={8} stroke="#475569" strokeWidth={1.5} />
                <text x={v} y={24} textAnchor="middle" fontSize={12} fontWeight={500} fill="#475569">{v}</text>
              </g>
            ))}
            {/* Y-axis ticks */}
            {axisTicks.yTicks.map((v) => (
              <g key={`yt-${v}`}>
                <line x1={-8} y1={v} x2={8} y2={v} stroke="#475569" strokeWidth={1.5} />
                <text x={-14} y={v + 5} textAnchor="end" fontSize={12} fontWeight={500} fill="#475569">{v}</text>
              </g>
            ))}

            {/* ── Connecting lines ── */}
            {allPoints.slice(1).map((point, i) => {
              const prev = allPoints[i]
              return (
                <g key={`line-${i}`}>
                  <line
                    x1={prev.x} y1={prev.y} x2={point.x} y2={point.y}
                    stroke="#94a3b8" strokeWidth={2.5} strokeDasharray="10,5" strokeLinecap="round"
                  />
                  <circle cx={(prev.x + point.x) / 2} cy={(prev.y + point.y) / 2} r={6} fill="#cbd5e1" />
                </g>
              )
            })}

            {/* ── Points ── */}
            {allPoints.map((point, i) => {
              const isOrigin = point.name === '起点'
              const color = isOrigin ? '#475569' : THEME_COLORS[point.theme] || '#94a3b8'
              const r = isOrigin ? 10 : 14

              return (
                <g key={`point-${i}`}>
                  {/* Glow */}
                  <circle cx={point.x} cy={point.y} r={r + 8} fill={color} opacity={0.1} />
                  {/* Main circle */}
                  <circle cx={point.x} cy={point.y} r={r} fill={color} stroke="white" strokeWidth={3} />
                  {!isOrigin && <circle cx={point.x} cy={point.y} r={4} fill="white" />}

                  {/* Name */}
                  <text
                    x={point.x} y={point.y - r - 10}
                    textAnchor="middle" fontSize={14} fontWeight={700}
                    fill={isOrigin ? '#475569' : '#1e293b'}
                  >
                    {point.name}
                  </text>

                  {/* Arrive time */}
                  {!isOrigin && point.arriveTime && (
                    <text
                      x={point.x} y={point.y - r - 28}
                      textAnchor="middle" fontSize={12} fontWeight={500} fill="#64748b"
                    >
                      {point.arriveTime}
                    </text>
                  )}

                  {/* Coordinates (x, y) */}
                  <text
                    x={point.x} y={point.y + r + 18}
                    textAnchor="middle" fontSize={11} fontWeight={500} fill="#64748b"
                  >
                    ({point.x}, {point.y})
                  </text>

                  {/* Sequence number */}
                  {!isOrigin && (
                    <text
                      x={point.x + r + 10} y={point.y + r + 4}
                      textAnchor="middle" fontSize={14} fontWeight={800} fill={color}
                    >
                      {i}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-5 py-3 border-t border-slate-100 overflow-x-auto">
          <span className="text-xs text-slate-400 font-medium shrink-0">图例</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-500 shrink-0" />
            <span className="text-xs text-slate-500">起点</span>
          </div>
          {LEGEND.map((item) => (
            <div key={item.theme} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: THEME_COLORS[item.theme] }}
              />
              <span className="text-xs text-slate-500">{item.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-slate-400">--- 虚线为路线</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
