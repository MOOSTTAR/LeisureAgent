'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, CalendarBlank, Clock, CaretLeft, CaretRight, Trash, MapPin, Plus, X, PencilSimple, Share } from '@phosphor-icons/react'
import { getTravelPlans, deleteTravelPlan, createTravelPlan, updateTravelPlan, getTravelPlanById, getTravelPlanItems, deleteTravelPlanItem, updateTravelPlanItem, resolveLocation, type TravelPlan, type TravelPlanItem, type ResolvedLocation } from '../api'
import { ShareModal } from '../components/ShareModal'
import { encodePlanId } from '../utils/shareCode'

interface TravelPlanPageProps {
  onBack: () => void
}

const TRAVEL_TYPE_COLORS: Record<string, string> = {
  '亲子': 'bg-pink-50 text-pink-600',
  '聚会': 'bg-blue-50 text-blue-600',
  '单人出行': 'bg-emerald-50 text-emerald-600',
}

const TRAVEL_TYPE_ICONS: Record<string, string> = {
  '亲子': '👨‍👩‍👧',
  '聚会': '🎉',
  '单人出行': '🧘',
}

const THEME_COLORS: Record<ResolvedLocation['theme'], { bg: string; text: string; border: string; dot: string }> = {
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', dot: 'bg-orange-400' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-400' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200', dot: 'bg-pink-400' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', dot: 'bg-violet-400' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', dot: 'bg-amber-400' },
}

function TravelPlanCard({ plan, onDelete, onShare, onClick }: { plan: TravelPlan; onDelete: (id: number) => void; onShare: (id: number) => void; onClick: () => void }) {
  const typeColor = TRAVEL_TYPE_COLORS[plan.travel_type || ''] || 'bg-slate-50 text-slate-500'
  const typeIcon = TRAVEL_TYPE_ICONS[plan.travel_type || ''] || '📋'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-200/50 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)] overflow-hidden cursor-pointer hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)] transition-shadow group"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-slate-900 tracking-tight truncate">
              {plan.plan_title}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onShare(plan.id) }}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
              title="分享计划"
            >
              <Share size={16} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onDelete(plan.id) }}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              title="删除计划"
            >
              <Trash size={16} />
            </motion.button>
            {plan.travel_type && (
              <span className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap ${typeColor}`}>
                {typeIcon} {plan.travel_type}
              </span>
            )}
          </div>
        </div>

        {plan.plan_desc && (
          <p className="text-sm text-slate-500 mb-3 leading-relaxed">
            {plan.plan_desc}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-100">
          {plan.travel_date && (
            <span className="flex items-center gap-1">
              <CalendarBlank size={14} />
              {plan.travel_date}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock size={14} />
            创建于 {plan.created_at}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

const TRAVEL_TYPES = ['亲子', '聚会', '单人出行'] as const

interface CreatePlanModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

function CreatePlanModal({ isOpen, onClose, onCreated }: CreatePlanModalProps) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [travelType, setTravelType] = useState('')
  const [travelDate, setTravelDate] = useState('')
  const [travelDays, setTravelDays] = useState(1)
  const [totalCost, setTotalCost] = useState<number | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim()) return
    setIsSubmitting(true)
    try {
      const result = await createTravelPlan({
        plan_title: title.trim(),
        plan_desc: desc.trim() || null,
        travel_type: travelType || null,
        travel_date: travelDate || null,
        travel_days: travelDays,
        total_cost: totalCost === '' ? 0 : totalCost,
      })
      if (result.code === 0) {
        onCreated()
        onClose()
        setTitle('')
        setDesc('')
        setTravelType('')
        setTravelDate('')
        setTravelDays(1)
        setTotalCost('')
      }
    } catch (error) {
      console.error('Failed to create plan:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-medium text-slate-900">添加计划</h2>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">计划标题 *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：周末亲子一日游"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">备注</label>
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="简单描述一下计划..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">游玩类型</label>
                  <select
                    value={travelType}
                    onChange={(e) => setTravelType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                  >
                    <option value="">不限</option>
                    {TRAVEL_TYPES.map((t) => (
                      <option key={t} value={t}>{TRAVEL_TYPE_ICONS[t] || ''} {t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">出行日期</label>
                  <input
                    type="date"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">行程天数</label>
                  <select
                    value={travelDays}
                    onChange={(e) => setTravelDays(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                  >
                    <option value={1}>1 天</option>
                    <option value={2}>2 天</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">预估花费（元）</label>
                  <input
                    type="number"
                    value={totalCost}
                    onChange={(e) => setTotalCost(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    min="0"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!title.trim() || isSubmitting}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all ${
                  title.trim() && !isSubmitting
                    ? 'bg-blue-500 hover:bg-blue-600 shadow-md shadow-blue-200'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? '创建中...' : '创建'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface EditItemModalProps {
  item: TravelPlanItem
  isOpen: boolean
  onClose: () => void
  onUpdated: () => void
}

function EditItemModal({ item, isOpen, onClose, onUpdated }: EditItemModalProps) {
  const [arriveTime, setArriveTime] = useState(item.arrive_time || '')
  const [leaveTime, setLeaveTime] = useState(item.leave_time || '')
  const [stayMinute, setStayMinute] = useState(item.stay_minute)
  const [remark, setRemark] = useState(item.remark || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setArriveTime(item.arrive_time || '')
      setLeaveTime(item.leave_time || '')
      setStayMinute(item.stay_minute)
      setRemark(item.remark || '')
    }
  }, [isOpen, item])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await updateTravelPlanItem(item.id, {
        arrive_time: arriveTime || null,
        leave_time: leaveTime || null,
        stay_minute: stayMinute,
        remark: remark || null,
      })
      onUpdated()
      onClose()
    } catch (error) {
      console.error('Failed to update item:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-medium text-slate-900">编辑行程</h2>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">到达时间</label>
                  <input
                    type="time"
                    value={arriveTime}
                    onChange={(e) => setArriveTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">离开时间</label>
                  <input
                    type="time"
                    value={leaveTime}
                    onChange={(e) => setLeaveTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">停留时间（分钟）</label>
                <input
                  type="number"
                  value={stayMinute}
                  onChange={(e) => setStayMinute(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">备注</label>
                <input
                  type="text"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="例如：窗边位置预约"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all ${
                  !isSubmitting
                    ? 'bg-blue-500 hover:bg-blue-600 shadow-md shadow-blue-200'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? '保存中...' : '保存'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface EditPlanModalProps {
  plan: TravelPlan
  isOpen: boolean
  onClose: () => void
  onUpdated: () => void
}

function EditPlanModal({ plan, isOpen, onClose, onUpdated }: EditPlanModalProps) {
  const [title, setTitle] = useState(plan.plan_title)
  const [desc, setDesc] = useState(plan.plan_desc || '')
  const [travelType, setTravelType] = useState(plan.travel_type || '')
  const [travelDate, setTravelDate] = useState(plan.travel_date || '')
  const [travelDays, setTravelDays] = useState(plan.travel_days)
  const [totalCost, setTotalCost] = useState<number | ''>(plan.total_cost)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim()) return
    setIsSubmitting(true)
    try {
      await updateTravelPlan(plan.id, {
        plan_title: title.trim(),
        plan_desc: desc.trim() || null,
        travel_type: travelType || null,
        travel_date: travelDate || null,
        travel_days: travelDays,
        total_cost: totalCost === '' ? 0 : totalCost,
      })
      onUpdated()
      onClose()
    } catch (error) {
      console.error('Failed to update plan:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-medium text-slate-900">编辑计划</h2>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">计划标题 *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">备注</label>
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">游玩类型</label>
                  <select
                    value={travelType}
                    onChange={(e) => setTravelType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                  >
                    <option value="">不限</option>
                    {TRAVEL_TYPES.map((t) => (
                      <option key={t} value={t}>{TRAVEL_TYPE_ICONS[t] || ''} {t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">出行日期</label>
                  <input
                    type="date"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">行程天数</label>
                  <select
                    value={travelDays}
                    onChange={(e) => setTravelDays(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                  >
                    <option value={1}>1 天</option>
                    <option value={2}>2 天</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">预估花费（元）</label>
                  <input
                    type="number"
                    value={totalCost}
                    onChange={(e) => setTotalCost(e.target.value === '' ? '' : Number(e.target.value))}
                    min="0"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!title.trim() || isSubmitting}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all ${
                  title.trim() && !isSubmitting
                    ? 'bg-blue-500 hover:bg-blue-600 shadow-md shadow-blue-200'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? '保存中...' : '保存'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface PlanDetailProps {
  plan: TravelPlan
  onBack: () => void
}

function PlanDetail({ plan, onBack }: PlanDetailProps) {
  const [items, setItems] = useState<TravelPlanItem[]>([])
  const [locations, setLocations] = useState<Map<number, ResolvedLocation | null>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null)
  const [editItemModal, setEditItemModal] = useState<TravelPlanItem | null>(null)
  const [planData, setPlanData] = useState(plan)

  const fetchDetail = async () => {
    setIsLoading(true)
    try {
      const res = await getTravelPlanItems({ plan_id: plan.id })
      const fetchedItems = res.data.list
      setItems(fetchedItems)

      const locMap = new Map<number, ResolvedLocation | null>()
      await Promise.all(
        fetchedItems.map(async (item) => {
          locMap.set(item.id, await resolveLocation(item.location_table_name, item.location_id))
        })
      )
      setLocations(locMap)
    } catch (error) {
      console.error('Failed to fetch plan items:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDetail()
  }, [plan.id])

  const handleDeleteItem = async (itemId: number) => {
    setDeletingItemId(itemId)
    try {
      const result = await deleteTravelPlanItem(itemId)
      if (result.code === 0) {
        setItems(prev => prev.filter(i => i.id !== itemId))
        setLocations(prev => { const next = new Map(prev); next.delete(itemId); return next })
      }
    } catch (error) {
      console.error('Failed to delete item:', error)
    } finally {
      setDeletingItemId(null)
    }
  }

  const handlePlanUpdated = async () => {
    const res = await getTravelPlanById(plan.id)
    if (res.data) setPlanData(res.data)
  }

  // Group items by day_num
  const groupedByDay = new Map<number, TravelPlanItem[]>()
  for (const item of items) {
    const day = item.day_num || 1
    if (!groupedByDay.has(day)) groupedByDay.set(day, [])
    groupedByDay.get(day)!.push(item)
  }
  const sortedDays = Array.from(groupedByDay.keys()).sort((a, b) => a - b)

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="shrink-0 bg-white/80 backdrop-blur-sm border-b border-slate-200/50 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft weight="bold" size={24} className="text-slate-600" />
            </motion.button>
            <h1 className="text-lg font-medium text-slate-900 tracking-tight">{planData.plan_title}</h1>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setEditModalOpen(true)}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-blue-500"
              title="编辑计划"
            >
              <PencilSimple size={16} />
            </motion.button>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 ml-11">
            {planData.travel_date && (
              <span className="flex items-center gap-1">
                <CalendarBlank size={14} />
                {planData.travel_date}
              </span>
            )}
            {planData.travel_type && (
              <span className={`px-2 py-0.5 rounded-md font-medium ${TRAVEL_TYPE_COLORS[planData.travel_type] || 'bg-slate-50 text-slate-500'}`}>
                {TRAVEL_TYPE_ICONS[planData.travel_type] || ''} {planData.travel_type}
              </span>
            )}
            <span>共 {planData.travel_days} 天</span>
            <span>预算约 ¥{planData.total_cost}</span>
          </div>
          {planData.plan_desc && (
            <p className="text-sm text-slate-500 mt-2 ml-11">{planData.plan_desc}</p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="flex items-center gap-2 text-slate-500">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-sm ml-2">加载中...</span>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6">
            {sortedDays.map((day) => (
              <div key={day} className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-blue-500 text-white text-sm font-medium rounded-lg">
                    第 {day} 天
                  </span>
                  <span className="text-xs text-slate-400">
                    {groupedByDay.get(day)!.length} 个行程
                  </span>
                </div>

                <div className="relative pl-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {groupedByDay.get(day)!.map((item, idx) => {
                    const loc = locations.get(item.id)
                    const theme = loc?.theme ? THEME_COLORS[loc.theme] : THEME_COLORS.orange

                    return (
                      <div key={item.id} className="relative mb-5 last:mb-0">
                        {/* Timeline dot */}
                        <div className={`absolute -left-[26px] top-3 w-3 h-3 rounded-full border-2 border-white ${theme.dot} z-10`} />

                        {/* Card */}
                        <motion.div
                          whileHover={{ y: -2, scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`bg-white rounded-xl border ${theme.border} shadow-sm overflow-hidden cursor-default`}
                        >
                          {/* Time bar */}
                          {(item.arrive_time || item.leave_time) && (
                            <div className={`flex items-center gap-3 px-4 py-2.5 ${theme.bg} border-b ${theme.border}`}>
                              <Clock size={14} className={theme.text} />
                              <span className={`text-sm font-medium ${theme.text}`}>
                                {item.arrive_time || '--'} — {item.leave_time || '--'}
                              </span>
                              {item.stay_minute > 0 && (
                                <span className={`text-xs ${theme.text} opacity-70`}>
                                  停留 {item.stay_minute} 分钟
                                </span>
                              )}
                            </div>
                          )}

                          <div className="p-4">
                            {loc ? (
                              <>
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${theme.bg} ${theme.text}`}>
                                        {loc.typeLabel}
                                      </span>
                                      {loc.subtypeLabel && (
                                        <span className="px-2 py-0.5 text-xs rounded-md bg-slate-100 text-slate-500">
                                          {loc.subtypeLabel}
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="text-base font-medium text-slate-900">{loc.name}</h4>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 ml-2">
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => setEditItemModal(item)}
                                      className="p-1.5 rounded-lg text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                                      title="编辑行程"
                                    >
                                      <PencilSimple size={14} />
                                    </motion.button>
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => handleDeleteItem(item.id)}
                                      disabled={deletingItemId === item.id}
                                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                      title="删除此行程"
                                    >
                                      {deletingItemId === item.id ? (
                                        <span className="text-xs text-slate-400">...</span>
                                      ) : (
                                        <Trash size={14} />
                                      )}
                                    </motion.button>
                                  </div>
                                </div>
                                <p className="flex items-center gap-1 text-xs text-slate-400 mb-2">
                                  <MapPin size={12} />
                                  {loc.address}
                                </p>
                              </>
                            ) : (
                              <div className="text-sm text-slate-400">
                                场所信息加载中...
                              </div>
                            )}

                            {item.remark && (
                              <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100 leading-relaxed">
                                {item.remark}
                              </p>
                            )}
                            {item.is_need_booking === 1 && (
                              <div className="flex justify-end mt-2 pt-2 border-t border-slate-100">
                                <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${
                                  item.is_had_booking === 1
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-600 border border-amber-200'
                                }`}>
                                  {item.is_had_booking === 1 ? '已预约' : '未预约'}
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {items.length === 0 && (
              <div className="text-center py-16">
                <p className="text-slate-400 text-lg">暂无行程明细</p>
              </div>
            )}
          </div>
        )}
      </div>

      <EditPlanModal
        plan={planData}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onUpdated={handlePlanUpdated}
      />

      {editItemModal && (
        <EditItemModal
          item={editItemModal}
          isOpen={true}
          onClose={() => setEditItemModal(null)}
          onUpdated={fetchDetail}
        />
      )}
    </motion.div>
  )
}

export function TravelPlanPage({ onBack }: TravelPlanPageProps) {
  const [plans, setPlans] = useState<TravelPlan[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isFetching, setIsFetching] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<TravelPlan | null>(null)
  const [pageSize, setPageSize] = useState(5)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [sharePlanId, setSharePlanId] = useState<number | null>(null)

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      const result = await deleteTravelPlan(id)
      if (result.code === 0) {
        setPlans(prev => prev.filter(p => p.id !== id))
        setTotal(prev => prev - 1)
      }
    } catch (error) {
      console.error('Failed to delete travel plan:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const fetchPlans = async () => {
    setIsFetching(true)
    try {
      const response = await getTravelPlans({ page, page_size: pageSize })
      setPlans(response.data.list)
      setTotal(response.data.total)
    } catch (error) {
      console.error('Failed to fetch travel plans:', error)
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [page, pageSize])

  useEffect(() => {
    setPage(1)
  }, [pageSize])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50/50">
      <AnimatePresence mode="wait">
        {selectedPlan ? (
          <PlanDetail
            key={`detail-${selectedPlan.id}`}
            plan={selectedPlan}
            onBack={() => setSelectedPlan(null)}
          />
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col h-full"
          >
            <nav className="border-b border-slate-200/50 bg-white/80 backdrop-blur-sm shrink-0">
              <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.button
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onBack}
                      className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <ArrowLeft weight="bold" size={24} className="text-slate-600" />
                    </motion.button>
                    <div>
                      <h1 className="text-lg font-medium tracking-tight text-slate-900">
                        我的计划
                      </h1>
                      <p className="text-xs text-slate-500">
                        共 {total} 个方案
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCreateModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium shadow-md shadow-blue-200 hover:bg-blue-600 transition-colors"
                  >
                    <Plus size={18} weight="bold" />
                    添加计划
                  </motion.button>
                </div>
              </div>
            </nav>

            <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
              {isFetching ? (
                <div className="flex justify-center py-16">
                  <div className="flex items-center gap-2 text-slate-500">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-sm ml-2">加载中...</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="max-w-3xl mx-auto w-full px-4 py-4 space-y-4">
                    {plans.map((plan) => (
                      <div key={plan.id} className={`relative ${deletingId === plan.id ? 'pointer-events-none opacity-50' : ''}`}>
                        <TravelPlanCard plan={plan} onDelete={handleDelete} onShare={(id) => setSharePlanId(id)} onClick={() => setSelectedPlan(plan)} />
                        {deletingId === plan.id && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm text-slate-400">删除中...</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {total === 0 && (
                    <div className="text-center py-16">
                      <p className="text-slate-400 text-lg">暂无计划</p>
                      <p className="text-slate-400 text-sm mt-2">去手动规划创建一个吧</p>
                    </div>
                  )}

                  {total > 0 && (
                    <div className="flex items-center justify-between py-6 px-4 max-w-3xl mx-auto">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>每页</span>
                        {([5, 10] as const).map((size) => (
                          <button
                            key={size}
                            onClick={() => setPageSize(size)}
                            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                              pageSize === size
                                ? 'bg-blue-500 text-white'
                                : 'text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                        <span>条</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          disabled={page <= 1}
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          className={`p-2 rounded-xl transition-colors ${
                            page <= 1
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <CaretLeft size={20} weight="bold" />
                        </motion.button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                          <motion.button
                            key={p}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setPage(p)}
                            className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                              p === page
                                ? 'bg-blue-500 text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {p}
                          </motion.button>
                        ))}

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          disabled={page >= totalPages}
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          className={`p-2 rounded-xl transition-colors ${
                            page >= totalPages
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <CaretRight size={20} weight="bold" />
                        </motion.button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CreatePlanModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={fetchPlans}
      />

      <ShareModal
        isOpen={sharePlanId !== null}
        onClose={() => setSharePlanId(null)}
        planTitle={plans.find(p => p.id === sharePlanId)?.plan_title || ''}
        shareUrl={sharePlanId !== null ? `${window.location.origin}${window.location.pathname}#/travel-plans/${encodePlanId(sharePlanId)}` : ''}
      />
    </div>
  )
}
