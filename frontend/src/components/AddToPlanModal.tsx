'use client'

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Clock, CalendarBlank, CaretDown } from '@phosphor-icons/react'
import { getTravelPlans, getTravelPlanItems, addTravelPlanItem, resolveLocation, type TravelPlan, type TravelPlanItem } from '../api'
import { toast } from './Toast'

interface AddToPlanModalProps {
  isOpen: boolean
  onClose: () => void
  item: {
    id: number
    name: string
    address: string
    booking_hours?: string | null
    current_booking_count?: number
    max_booking_count?: number
    queue_time?: number
  }
  locationTableName: string
  theme: 'orange' | 'emerald' | 'pink' | 'violet' | 'amber'
}

const THEME_COLORS: Record<string, { bg: string; text: string; border: string; ring: string; hover: string; dashed: string }> = {
  orange:   { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-400', ring: 'ring-orange-400/20', hover: 'hover:border-orange-300', dashed: 'border-orange-300 text-orange-600 hover:bg-orange-50' },
  emerald:  { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-400', ring: 'ring-emerald-400/20', hover: 'hover:border-emerald-300', dashed: 'border-emerald-300 text-emerald-600 hover:bg-emerald-50' },
  pink:     { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-400', ring: 'ring-pink-400/20', hover: 'hover:border-pink-300', dashed: 'border-pink-300 text-pink-600 hover:bg-pink-50' },
  violet:   { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-400', ring: 'ring-violet-400/20', hover: 'hover:border-violet-300', dashed: 'border-violet-300 text-violet-600 hover:bg-violet-50' },
  amber:    { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-400', ring: 'ring-amber-400/20', hover: 'hover:border-amber-300', dashed: 'border-amber-300 text-amber-600 hover:bg-amber-50' },
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function isOverlapping(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const as = timeToMinutes(aStart), ae = timeToMinutes(aEnd)
  const bs = timeToMinutes(bStart), be = timeToMinutes(bEnd)
  return !(ae <= bs || as >= be)
}

interface ConflictInfo {
  locationName: string
  arriveTime: string
  leaveTime: string
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

interface PopSelectProps {
  value: string
  options: string[]
  onChange: (value: string) => void
  theme: typeof THEME_COLORS['orange']
  placeholder?: string
}

function PopSelect({ value, options, onChange, theme: t, placeholder }: PopSelectProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleToggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 80) })
    }
    setOpen(!open)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (!triggerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={`px-2.5 py-2.5 bg-white border-2 rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-1 min-w-[52px] ${
          open ? `${t.border} ring-2 ${t.ring}` : `border-slate-200 ${t.hover}`
        }`}
      >
        <span className={value ? 'text-slate-700' : 'text-slate-400'}>
          {value || placeholder || ''}
        </span>
        <CaretDown size={12} className={`transition-transform shrink-0 ${open ? 'rotate-180' : 'text-slate-400'}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
            className="bg-white rounded-xl border border-slate-100 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.15)] py-1 z-[100] max-h-[200px] overflow-y-auto"
          >
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false) }}
                className={`w-full text-center px-3 py-2 text-sm transition-colors ${
                  value === opt ? `${t.bg} ${t.text} font-medium` : 'text-slate-600 hover:bg-slate-50'
                } first:rounded-t-xl last:rounded-b-xl`}
              >
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export function AddToPlanModal({ isOpen, onClose, item, locationTableName, theme }: AddToPlanModalProps) {
  const navigate = useNavigate()
  const c = THEME_COLORS[theme]

  const [plans, setPlans] = useState<TravelPlan[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const [planItems, setPlanItems] = useState<TravelPlanItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)

  // Time selection
  const [startHour, setStartHour] = useState('14')
  const [startMin, setStartMin] = useState('00')
  const [endHour, setEndHour] = useState('16')
  const [endMin, setEndMin] = useState('00')
  const [dayNum, setDayNum] = useState(1)
  const [remark, setRemark] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<ConflictInfo | null>(null)

  const [planDropdownOpen, setPlanDropdownOpen] = useState(false)
  const [planDropdownPos, setPlanDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const planTriggerRef = useRef<HTMLButtonElement>(null)
  const planDropdownRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const togglePlanDropdown = () => {
    if (!planDropdownOpen && planTriggerRef.current) {
      const rect = planTriggerRef.current.getBoundingClientRect()
      setPlanDropdownPos({ top: rect.bottom + 6, left: rect.left, width: rect.width })
    }
    setPlanDropdownOpen(!planDropdownOpen)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      const clickedOnTrigger = planTriggerRef.current?.contains(target)
      const clickedOnDropdown = planDropdownRef.current?.contains(target)
      if (!clickedOnTrigger && !clickedOnDropdown) {
        setPlanDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedPlan = plans.find(p => p.id === selectedPlanId)

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedPlanId(null)
      setPlanItems([])
      setStartHour('14')
      setStartMin('00')
      setEndHour('16')
      setEndMin('00')
      setDayNum(1)
      setRemark('')
      setError(null)
      setConflict(null)
      setSubmitting(false)
      setPlanDropdownOpen(false)
      loadPlans()
    }
  }, [isOpen])

  const loadPlans = async () => {
    setPlansLoading(true)
    try {
      const res = await getTravelPlans({ page_size: 100 })
      setPlans(res.data.list)
    } catch {
      setPlans([])
    } finally {
      setPlansLoading(false)
    }
  }

  const loadPlanItems = async (planId: number) => {
    setItemsLoading(true)
    try {
      const res = await getTravelPlanItems({ plan_id: planId, page_size: 100 })
      setPlanItems(res.data.list)
    } catch {
      setPlanItems([])
    } finally {
      setItemsLoading(false)
    }
  }

  const handlePlanChange = (planId: number) => {
    setSelectedPlanId(planId)
    setConflict(null)
    setError(null)
    if (planId) {
      loadPlanItems(planId)
    } else {
      setPlanItems([])
    }
  }

  // Real-time conflict check when time or plan changes
  const userArriveTime = `${startHour}:${startMin}`
  const userLeaveTime = `${endHour}:${endMin}`
  const queueTime = item.queue_time && item.queue_time > 0 ? item.queue_time : 0

  const adjustedArriveTime = queueTime > 0
    ? minutesToTime(timeToMinutes(userArriveTime) - queueTime)
    : userArriveTime
  const adjustedLeaveTime = userLeaveTime

  const checkConflict = async () => {
    if (!userArriveTime || !userLeaveTime) { setConflict(null); return }
    if (timeToMinutes(userArriveTime) >= timeToMinutes(userLeaveTime)) { setConflict(null); return }
    if (timeToMinutes(adjustedArriveTime) >= timeToMinutes(adjustedLeaveTime)) { setConflict(null); return }

    for (const pi of planItems) {
      if (!pi.arrive_time || !pi.leave_time) continue
      if (isOverlapping(adjustedArriveTime, adjustedLeaveTime, pi.arrive_time, pi.leave_time)) {
        const loc = await resolveLocation(pi.location_table_name, pi.location_id)
        setConflict({
          locationName: loc?.name || '未知场所',
          arriveTime: pi.arrive_time,
          leaveTime: pi.leave_time,
        })
        return
      }
    }
    setConflict(null)
  }

  useEffect(() => {
    checkConflict()
  }, [startHour, startMin, endHour, endMin, planItems])

  // Booking full check
  const bookingFull =
    item.current_booking_count !== undefined &&
    item.max_booking_count !== undefined &&
    item.current_booking_count >= 0 &&
    item.max_booking_count > 0 &&
    item.current_booking_count >= item.max_booking_count

  const timeInvalid = timeToMinutes(userArriveTime) >= timeToMinutes(userLeaveTime)
  const canSubmit = selectedPlanId !== null && !bookingFull && !conflict && !timeInvalid && !submitting

  const handleSubmit = async () => {
    if (!canSubmit || selectedPlanId === null) return

    setSubmitting(true)
    setError(null)
    try {
      const stayMinute = timeToMinutes(adjustedLeaveTime) - timeToMinutes(adjustedArriveTime)
      const queueRemark = queueTime > 0 ? `排队约${queueTime}分钟` : ''
      const finalRemark = [queueRemark, remark].filter(Boolean).join('；')
      await addTravelPlanItem({
        plan_id: selectedPlanId,
        location_table_name: locationTableName,
        location_id: item.id,
        day_num: dayNum,
        arrive_time: adjustedArriveTime,
        leave_time: adjustedLeaveTime,
        stay_minute: stayMinute,
        remark: finalRemark,
        is_need_booking: item.booking_hours && item.booking_hours !== '不能预约' ? 1 : 0,
        is_had_booking: 0,
      })
      toast.success('已添加到计划')
      onClose()
    } catch (err: any) {
      setError(err?.message || '添加失败，请重试')
      toast.error('添加失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  const goToTravelPlans = () => {
    sessionStorage.setItem('returnToAddPlan', JSON.stringify({
      locationTableName,
      item,
      theme,
    }))
    navigate('/travel-plans')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.2)] w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">添加到计划</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={goToTravelPlans}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
                >
                  查看我的计划 <CalendarBlank size={14} />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Item info */}
              <div className={`${c.bg} rounded-xl p-3`}>
                <p className="font-medium text-slate-900 text-sm">{item.name}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{item.address}</p>
              </div>

              {/* Plan selection */}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">选择计划</label>
                {plansLoading ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                    <span>加载计划列表...</span>
                  </div>
                ) : plans.length === 0 ? (
                  <div className="text-center py-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-400">目前还没有计划</p>
                    <button
                      onClick={goToTravelPlans}
                      className={`mt-1.5 text-sm font-medium ${c.text} hover:underline`}
                    >
                      去创建一个计划
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      ref={planTriggerRef}
                      onClick={togglePlanDropdown}
                      className={`w-full px-3 py-2.5 bg-white border-2 rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        planDropdownOpen
                          ? `${c.border} ring-2 ${c.ring}`
                          : `border-slate-200 ${c.hover}`
                      }`}
                    >
                      <span className={selectedPlan ? 'text-slate-700' : 'text-slate-400'}>
                        {selectedPlan ? `${selectedPlan.plan_title} (${selectedPlan.travel_days}天)` : '选择要添加到的计划...'}
                      </span>
                      <CaretDown size={16} className={`transition-transform shrink-0 ${planDropdownOpen ? 'rotate-180 text-slate-600' : 'text-slate-400'}`} />
                    </button>
                  </div>
                )}
                <AnimatePresence>
                  {planDropdownOpen && (
                    <motion.div
                      ref={planDropdownRef}
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        position: 'fixed',
                        top: planDropdownPos.top,
                        left: planDropdownPos.left,
                        width: planDropdownPos.width,
                      }}
                      className="bg-white rounded-xl border border-slate-100 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.15)] py-1 z-[100] max-h-[200px] overflow-y-auto"
                    >
                      {plans.map((plan) => (
                        <button
                          key={plan.id}
                          onClick={() => {
                            handlePlanChange(plan.id)
                            setPlanDropdownOpen(false)
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                            selectedPlanId === plan.id
                              ? `${c.bg} ${c.text} font-medium`
                              : 'text-slate-600 hover:bg-slate-50'
                          } first:rounded-t-xl last:rounded-b-xl`}
                        >
                          <span className="block truncate">{plan.plan_title}</span>
                          <span className="block text-xs mt-0.5 opacity-60">
                            {plan.travel_days}天{plan.travel_date ? ` · ${plan.travel_date}` : ''}
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Time selection */}
              {selectedPlanId !== null && (
                <>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">时间段</label>
                    <div className="flex items-center gap-1.5">
                      <PopSelect value={startHour} options={HOURS} onChange={setStartHour} theme={c} />
                      <span className="text-slate-400 font-medium text-sm">:</span>
                      <PopSelect value={startMin} options={MINUTES} onChange={setStartMin} theme={c} />
                      <span className="text-slate-300 font-medium mx-0.5">—</span>
                      <PopSelect value={endHour} options={HOURS} onChange={setEndHour} theme={c} />
                      <span className="text-slate-400 font-medium text-sm">:</span>
                      <PopSelect value={endMin} options={MINUTES} onChange={setEndMin} theme={c} />
                    </div>
                  </div>

                  {/* Queue time adjustment */}
                  {queueTime > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 text-sm text-amber-700 font-medium">
                        <Clock size={16} />
                        该活动需要排队 {queueTime} 分钟
                      </div>
                      <p className="text-xs text-amber-600 mt-1.5">
                        选择的时间段：
                        <span className="font-mono font-medium ml-1">
                          {userArriveTime}<span className="text-red-500">(-{queueTime})</span>-{userLeaveTime}
                        </span>
                      </p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        实际占用时间：
                        <span className="font-mono font-medium ml-1">{adjustedArriveTime} - {adjustedLeaveTime}</span>
                      </p>
                    </div>
                  )}

                  {/* Time invalid warning */}
                  {timeInvalid && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-sm text-red-600">结束时间必须晚于开始时间</p>
                    </div>
                  )}

                  {/* Conflict warning */}
                  {conflict && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-sm text-red-600 font-medium">时间段冲突</p>
                      <p className="text-xs text-red-500 mt-1">
                        与「{conflict.locationName}」({conflict.arriveTime}-{conflict.leaveTime}) 时间冲突，请调整时间
                      </p>
                    </div>
                  )}

                  {/* Day number */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-slate-500">第</label>
                    <PopSelect
                      value={String(dayNum)}
                      options={['1', '2']}
                      onChange={(v) => setDayNum(Number(v))}
                      theme={c}
                    />
                    <label className="text-xs font-medium text-slate-500">天</label>
                  </div>

                  {/* Remark */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                      备注
                      {queueTime > 0 && (
                        <span className="text-amber-600 ml-1">（已自动记录排队 {queueTime} 分钟）</span>
                      )}
                    </label>
                    <textarea
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      placeholder="添加备注..."
                      rows={2}
                      maxLength={200}
                      className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 resize-none transition-all focus:outline-none focus:border-slate-300 hover:border-slate-300"
                    />
                  </div>
                </>
              )}

              {/* Booking full warning */}
              {bookingFull && selectedPlanId !== null && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-sm text-red-600">预约名额已满，无法添加到计划</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {selectedPlanId !== null && (
              <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                    canSubmit
                      ? `${c.bg} ${c.text} border-2 ${c.border} hover:shadow-sm`
                      : 'bg-slate-100 text-slate-400 border-2 border-slate-100 cursor-not-allowed'
                  }`}
                >
                  <Plus size={16} />
                  {submitting ? '添加中...' : '确认添加'}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
