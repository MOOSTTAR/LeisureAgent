'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, CaretDown, Trash, Plus, PencilSimple, X } from '@phosphor-icons/react'
import { getParks, getBookingParks, deletePark, createPark, updatePark, type Park } from '../api'
import { AddToPlanModal } from '../components/AddToPlanModal'
import { CustomSelect, type SelectOption } from '../components/CustomSelect'

const CrowdDensity = {
  LOW: 1,      // 稀少
  MEDIUM: 2,   // 适中
  HIGH: 3,     // 拥挤
} as const

type CrowdDensityType = typeof CrowdDensity[keyof typeof CrowdDensity]

const CROWD_DENSITY_LABELS: Record<CrowdDensityType, string> = {
  [CrowdDensity.LOW]: '稀少',
  [CrowdDensity.MEDIUM]: '适中',
  [CrowdDensity.HIGH]: '拥挤',
}

const CROWD_DENSITY_COLORS: Record<CrowdDensityType, string> = {
  [CrowdDensity.LOW]: 'bg-green-50 text-green-600',
  [CrowdDensity.MEDIUM]: 'bg-yellow-50 text-yellow-600',
  [CrowdDensity.HIGH]: 'bg-red-50 text-red-600',
}

interface FilterOptions {
  name?: string
  spot_type?: string
  crowd_level?: CrowdDensityType
  can_book?: boolean
  distance?: '<200m' | '<500m' | '<1.0km' | '<2.0km' | 'other'
}

interface ParkCardProps {
  park: Park
  onDelete?: (id: number) => void
  onEdit?: () => void
  onClick?: () => void
  onAddToPlan?: () => void
}

function ParkCard({ park, onDelete, onEdit, onClick, onAddToPlan }: ParkCardProps) {
  const distance = Math.abs(park.x) + Math.abs(park.y)
  const distanceText = distance >= 1000 ? `${(distance / 1000).toFixed(1)}km` : `${distance}m`
  const densityLabel = CROWD_DENSITY_LABELS[park.crowd_density as CrowdDensityType]
  const densityColor = CROWD_DENSITY_COLORS[park.crowd_density as CrowdDensityType]
  const canBook = park.booking_hours !== '不能预约'

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
              {park.name}
            </h3>
            <p className="text-sm text-slate-500 mt-1 truncate">
              {park.address}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onEdit?.() }}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500 transition-colors opacity-0 group-hover:opacity-100"
              title="编辑景点"
            >
              <PencilSimple size={16} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onDelete?.(park.id) }}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              title="删除景点"
            >
              <Trash size={16} />
            </motion.button>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-lg whitespace-nowrap">
              {distanceText}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {park.spot_type && (
            <span className="px-2 py-0.5 text-xs rounded-md whitespace-nowrap bg-blue-50 text-blue-600">
              {park.spot_type}
            </span>
          )}
          <span className={`px-2 py-0.5 text-xs rounded-md whitespace-nowrap ${densityColor}`}>
            人流：{densityLabel}
          </span>
          {canBook ? (
            <span className="px-2 py-0.5 text-xs rounded-md whitespace-nowrap bg-emerald-50 text-emerald-600">
              可预约（{park.current_booking_count}/{park.max_booking_count}）
            </span>
          ) : (
            <span className="px-2 py-0.5 text-xs rounded-md whitespace-nowrap bg-slate-50 text-slate-400">
              无需预约
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-slate-400 pt-2 border-t border-slate-100">
          {park.business_hours && (
            <span>营业：{park.business_hours}</span>
          )}
          {canBook && park.booking_hours && (
            <span>可约时段：{park.booking_hours}</span>
          )}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onAddToPlan?.() }}
          className="w-full mt-3 py-2 rounded-xl text-sm font-medium border-2 border-dashed border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:border-solid transition-all flex items-center justify-center gap-1.5"
        >
          <Plus size={14} />
          添加到计划
        </button>
      </div>
    </motion.div>
  )
}

interface ParkFormData {
  name: string
  address: string
  x: number
  y: number
  spot_type: string | null
  business_hours: string | null
  booking_hours: string | null
  current_booking_count: number
  max_booking_count: number
  crowd_density: number
}

function ParkFormModal({ isOpen, editItem, onClose, onSaved }: {
  isOpen: boolean
  editItem: Park | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [x, setX] = useState(0)
  const [y, setY] = useState(0)
  const [spotType, setSpotType] = useState('山水')
  const [businessHours, setBusinessHours] = useState('')
  const [bookingHours, setBookingHours] = useState('')
  const [currentCount, setCurrentCount] = useState(-1)
  const [maxCount, setMaxCount] = useState(-1)
  const [crowdDensity, setCrowdDensity] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setName(editItem.name)
        setAddress(editItem.address)
        setX(editItem.x)
        setY(editItem.y)
        setSpotType(editItem.spot_type || '山水')
        setBusinessHours(editItem.business_hours || '')
        setBookingHours(editItem.booking_hours || '')
        setCurrentCount(editItem.current_booking_count)
        setMaxCount(editItem.max_booking_count)
        setCrowdDensity(editItem.crowd_density)
      } else {
        setName(''); setAddress(''); setX(0); setY(0); setSpotType('山水')
        setBusinessHours(''); setBookingHours(''); setCurrentCount(-1); setMaxCount(-1)
        setCrowdDensity(1)
      }
    }
  }, [isOpen, editItem])

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    const data: ParkFormData = {
      name: name.trim(),
      address: address.trim() || '未知',
      x, y,
      spot_type: spotType || null,
      business_hours: businessHours || null,
      booking_hours: bookingHours || null,
      current_booking_count: currentCount,
      max_booking_count: maxCount,
      crowd_density: crowdDensity,
    }
    if (editItem) {
      await updatePark(editItem.id, data)
    } else {
      await createPark(data)
    }
    setSubmitting(false)
    onSaved()
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-lg font-medium text-slate-900">{editItem ? '编辑景点' : '添加景点'}</h2>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">名称 *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">地址</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">坐标 X</label>
                  <input type="number" value={x} onChange={(e) => setX(Number(e.target.value))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">坐标 Y</label>
                  <input type="number" value={y} onChange={(e) => setY(Number(e.target.value))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">景点类型</label>
                <CustomSelect theme="emerald" value={spotType} options={[{ value: '山水', label: '山水' }, { value: '古迹', label: '古迹' }, { value: '人文', label: '人文' }, { value: '溶洞', label: '溶洞' }]} onChange={(v) => setSpotType(v)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">营业时间</label>
                  <input type="text" value={businessHours} onChange={(e) => setBusinessHours(e.target.value)} placeholder="06:00-18:00" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">预约时段</label>
                  <input type="text" value={bookingHours} onChange={(e) => setBookingHours(e.target.value)} placeholder="不能预约" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">当前预约数</label>
                  <input type="number" value={currentCount} onChange={(e) => setCurrentCount(Number(e.target.value))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">最大预约数</label>
                  <input type="number" value={maxCount} onChange={(e) => setMaxCount(Number(e.target.value))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">人流量</label>
                <CustomSelect theme="emerald" value={String(crowdDensity)} options={[{ value: '1', label: '稀少' }, { value: '2', label: '适中' }, { value: '3', label: '拥挤' }]} onChange={(v) => setCrowdDensity(Number(v))} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">取消</button>
              <button onClick={handleSubmit} disabled={!name.trim() || submitting} className={`px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all ${name.trim() && !submitting ? 'bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-200' : 'bg-slate-300 cursor-not-allowed'}`}>
                {submitting ? '保存中...' : '保存'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface FilterBarProps {
  filters: FilterOptions
  onFilterChange: (filters: FilterOptions) => void
  resultCount: number
}

function FilterBar({ filters, onFilterChange, resultCount }: FilterBarProps) {
  const handleReset = () => {
    onFilterChange({})
  }

  const hasActiveFilters = Object.keys(filters).length > 0
  const [collapsed, setCollapsed] = useState(true)

  const spotTypeOptions: SelectOption[] = [
    { value: '', label: '全部' },
    { value: '山水', label: '山水' },
    { value: '古迹', label: '古迹' },
    { value: '人文', label: '人文' },
    { value: '溶洞', label: '溶洞' },
  ]

  const crowdDensityOptions: SelectOption[] = [
    { value: '', label: '全部' },
    { value: String(CrowdDensity.LOW), label: '稀少' },
    { value: String(CrowdDensity.MEDIUM), label: '适中' },
    { value: String(CrowdDensity.HIGH), label: '拥挤' },
  ]

  const distanceOptions: SelectOption[] = [
    { value: '', label: '全部' },
    { value: '<200m', label: '< 200m' },
    { value: '<500m', label: '< 500m' },
    { value: '<1.0km', label: '< 1.0km' },
    { value: '<2.0km', label: '< 2.0km' },
    { value: 'other', label: '其它' },
  ]

  return (
    <div className="sticky top-[57px] z-10 bg-gradient-to-r from-emerald-50/95 via-white/95 to-emerald-50/95 backdrop-blur-sm border-b border-emerald-100/50 shadow-sm">
      <div className="max-w-5xl mx-auto px-6 py-4 space-y-4">
        <div className="flex items-center justify-center gap-4">
          <span className="text-sm text-slate-500 font-medium">筛选</span>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-xl hover:bg-emerald-100 transition-colors"
            title={collapsed ? '展开筛选' : '收起筛选'}
          >
            <CaretDown
              size={20}
              className={`text-slate-400 transition-transform ${collapsed ? '-rotate-90' : ''}`}
            />
          </button>
          <div className="relative">
            <input
              type="text"
              placeholder="搜索景点名字..."
              value={filters.name || ''}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  can_book: undefined,
                  name: e.target.value || undefined,
                })
              }
              className="w-56 px-4 py-2.5 bg-white border-2 border-emerald-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all shadow-sm"
            />
          </div>
          <span className="text-sm text-slate-500">
            已找到 <span className="text-emerald-600 font-bold text-base">{resultCount}</span> 个景点
          </span>
          {hasActiveFilters && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleReset}
              className="px-3 py-1.5 text-sm text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-full transition-all font-medium"
            >
              ✕ 重置
            </motion.button>
          )}
        </div>

        <AnimatePresence>
        {!collapsed && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-emerald-100"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">景点类型</span>
            <CustomSelect theme="emerald"
              value={filters.spot_type || ''}
              options={spotTypeOptions}
              onChange={(val) =>
                onFilterChange({
                  ...filters,
                  can_book: undefined,
                  spot_type: val || undefined,
                })
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">人流量</span>
            <CustomSelect theme="emerald"
              value={filters.crowd_level !== undefined ? String(filters.crowd_level) : ''}
              options={crowdDensityOptions}
              onChange={(val) =>
                onFilterChange({
                  ...filters,
                  can_book: undefined,
                  crowd_level: val ? Number(val) as CrowdDensityType : undefined,
                })
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">距离</span>
            <CustomSelect theme="emerald"
              value={filters.distance || ''}
              options={distanceOptions}
              onChange={(val) =>
                onFilterChange({
                  ...filters,
                  can_book: undefined,
                  distance: val ? (val as FilterOptions['distance']) : undefined,
                })
              }
            />
          </div>

          <button
            onClick={() =>
              onFilterChange(filters.can_book ? {} : { can_book: true })
            }
            className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all cursor-pointer ${
              filters.can_book
                ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300'
            }`}
          >
              可预约
          </button>
        </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  )
}

interface ParkPageProps {
  onBack: () => void
}

export function ParkPage({ onBack }: ParkPageProps) {
  const [filters, setFilters] = useState<FilterOptions>({})
  const [displayCount, setDisplayCount] = useState(5)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [parks, setParks] = useState<Park[]>([])
  const [total, setTotal] = useState(0)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Park | null>(null)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<Park | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('returnToAddPlan')
    if (!stored) return
    try {
      const data = JSON.parse(stored)
      if (data.locationTableName === 'scenic_spot') {
        sessionStorage.removeItem('returnToAddPlan')
        setSelectedItem(data.item)
        setModalOpen(true)
      }
    } catch {}
  }, [])

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      const result = await deletePark(id)
      if (result.code === 0) {
        setParks(prev => prev.filter(p => p.id !== id))
        setTotal(prev => prev - 1)
      }
    } catch (error) {
      console.error('Failed to delete park:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const fetchParks = async () => {
    setIsFetching(true)
    try {
      let response
      if (filters.can_book) {
        response = await getBookingParks({ page: 1, page_size: 100 })
      } else {
        const params: any = { page: 1, page_size: 100 }
        if (filters.name) params.name = filters.name
        if (filters.spot_type) params.spot_type = filters.spot_type
        if (filters.crowd_level !== undefined) params.crowd_level = filters.crowd_level
        if (filters.distance) params.distance = filters.distance
        response = await getParks(params)
      }
      setParks(response.data.list)
      setTotal(response.data.total)
      setDisplayCount(Math.min(5, response.data.list.length))
    } catch (error) {
      console.error('Failed to fetch parks:', error)
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => { fetchParks() }, [filters])

  // 滚动分页
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollTop = container.scrollTop
      const scrollHeight = container.scrollHeight
      const clientHeight = container.clientHeight

      if (scrollHeight - scrollTop - clientHeight < 100 && !isLoading && displayCount < total) {
        setIsLoading(true)
        setTimeout(() => {
          setDisplayCount((prev) => Math.min(prev + 5, total))
          setIsLoading(false)
        }, 500)
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [isLoading, displayCount, total])

  const displayedParks = parks.slice(0, displayCount)
  const hasMore = displayCount < total

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50/50">
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
                  户外景点
                </h1>
                <p className="text-xs text-slate-500">
                  已找到 {total} 个景点
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setEditItem(null); setFormModalOpen(true) }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium shadow-md shadow-emerald-200 hover:bg-emerald-600 transition-colors"
            >
              <Plus size={18} weight="bold" />
              添加景点
            </motion.button>
          </div>
        </div>
      </nav>

      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        resultCount={total}
      />

      <div ref={containerRef} className="flex-1 overflow-y-auto force-scroll" style={{ minHeight: 0 }}>
        {isFetching ? (
          <div className="flex justify-center py-16">
            <div className="flex items-center gap-2 text-slate-500">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-sm ml-2">加载中...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="max-w-3xl mx-auto w-full px-4 py-4 space-y-4">
              {displayedParks.map((park) => (
                <div className={`relative ${deletingId === park.id ? 'pointer-events-none opacity-50' : ''}`}>
                  <ParkCard key={park.id} park={park} onDelete={handleDelete} onEdit={() => { setEditItem(park); setFormModalOpen(true) }} onAddToPlan={() => { setSelectedItem(park); setModalOpen(true) }} />
                  {deletingId === park.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm text-slate-400">删除中...</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {total === 0 && (
              <div className="text-center py-16">
                <p className="text-slate-400 text-lg">没有找到符合条件的景点</p>
                <p className="text-slate-400 text-sm mt-2">试试调整筛选条件或点击重置</p>
              </div>
            )}

            {isLoading && (
              <div className="flex justify-center py-8">
                <div className="flex items-center gap-2 text-slate-500">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-sm ml-2">加载中...</span>
                </div>
              </div>
            )}

            {!isLoading && hasMore === false && displayedParks.length > 0 && (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm">— 没有更多了 —</p>
              </div>
            )}
          </>
        )}
      </div>

      {selectedItem && (
        <AddToPlanModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          item={{
            id: selectedItem.id,
            name: selectedItem.name,
            address: selectedItem.address,
            booking_hours: selectedItem.booking_hours,
            current_booking_count: selectedItem.current_booking_count,
            max_booking_count: selectedItem.max_booking_count,
            queue_time: undefined,
          }}
          locationTableName="scenic_spot"
          theme="emerald"
        />
      )}

      <ParkFormModal
        isOpen={formModalOpen}
        editItem={editItem}
        onClose={() => { setFormModalOpen(false); setEditItem(null) }}
        onSaved={fetchParks}
      />
    </div>
  )
}
