'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, CaretDown, Trash, Plus, PencilSimple, X } from '@phosphor-icons/react'
import { getExhibitions, deleteExhibition, createExhibition, updateExhibition, type ExhibitionHall } from '../api'
import { AddToPlanModal } from '../components/AddToPlanModal'

interface FilterOptions {
  name?: string
  hall_type?: string
  free_entry?: boolean
  distance?: '<200m' | '<500m' | '<1.0km' | '<2.0km' | 'other'
}

interface ExhibitionCardProps {
  hall: ExhibitionHall
  onDelete?: (id: number) => void
  onEdit?: () => void
  onClick?: () => void
  onAddToPlan?: () => void
}

function ExhibitionCard({ hall, onDelete, onEdit, onClick, onAddToPlan }: ExhibitionCardProps) {
  const distance = Math.abs(hall.x) + Math.abs(hall.y)
  const distanceText = distance >= 1000 ? `${(distance / 1000).toFixed(1)}km` : `${distance}m`
  const canBook = hall.booking_hours !== '不能预约'
  const isFree = hall.ticket_type === 0

  const crowdLabels: Record<number, { label: string; color: string }> = {
    1: { label: '人少', color: 'bg-green-50 text-green-600' },
    2: { label: '适中', color: 'bg-yellow-50 text-yellow-600' },
    3: { label: '拥挤', color: 'bg-red-50 text-red-600' },
  }
  const crowd = crowdLabels[hall.crowd_level] || { label: '未知', color: 'bg-slate-50 text-slate-400' }

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
              {hall.name}
            </h3>
            <p className="text-sm text-slate-500 mt-1 truncate">
              {hall.address}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onEdit?.() }}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-violet-50 hover:text-violet-500 transition-colors opacity-0 group-hover:opacity-100"
              title="编辑展馆"
            >
              <PencilSimple size={16} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onDelete?.(hall.id) }}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              title="删除展馆"
            >
              <Trash size={16} />
            </motion.button>
            <span className="px-2.5 py-1 bg-violet-50 text-violet-600 text-xs font-medium rounded-lg whitespace-nowrap">
              {distanceText}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {hall.hall_type && (
            <span className="px-2 py-0.5 text-xs rounded-md whitespace-nowrap bg-violet-50 text-violet-700">
              {hall.hall_type}
            </span>
          )}
          {hall.exhibition_theme && (
            <span className="px-2 py-0.5 text-xs rounded-md whitespace-nowrap bg-indigo-50 text-indigo-600">
              {hall.exhibition_theme}
            </span>
          )}
          <span className={`px-2 py-0.5 text-xs rounded-md whitespace-nowrap ${crowd.color}`}>
            {crowd.label}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 pt-2 border-t border-slate-100">
          <span className={isFree ? 'text-emerald-500 font-medium' : ''}>
            {isFree ? '免费' : `¥${hall.ticket_price}`}
          </span>
          {hall.manual_guide === 1 && <span>有人工讲解</span>}
          {hall.interactive_project === 1 && <span>有互动体验</span>}
          {canBook && <span>可预约（{hall.current_booking_count}/{hall.max_booking_count}）</span>}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onAddToPlan?.() }}
          className="w-full mt-3 py-2 rounded-xl text-sm font-medium border-2 border-dashed border-violet-300 text-violet-600 hover:bg-violet-50 hover:border-solid transition-all flex items-center justify-center gap-1.5"
        >
          <Plus size={14} />
          添加到计划
        </button>
      </div>
    </motion.div>
  )
}

interface ExhibitionFormData {
  name: string
  address: string
  x: number
  y: number
  hall_type: string | null
  business_hours: string | null
  booking_hours: string | null
  current_booking_count: number
  max_booking_count: number
  exhibition_theme: string | null
  ticket_type: number
  ticket_price: number | null
  manual_guide: number
  interactive_project: number
  crowd_level: number
}

function ExhibitionFormModal({ isOpen, editItem, onClose, onSaved }: {
  isOpen: boolean
  editItem: ExhibitionHall | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [x, setX] = useState(0)
  const [y, setY] = useState(0)
  const [hallType, setHallType] = useState('历史')
  const [businessHours, setBusinessHours] = useState('')
  const [bookingHours, setBookingHours] = useState('')
  const [currentCount, setCurrentCount] = useState(-1)
  const [maxCount, setMaxCount] = useState(-1)
  const [theme, setTheme] = useState('')
  const [ticketType, setTicketType] = useState(0)
  const [ticketPrice, setTicketPrice] = useState<number | ''>('')
  const [manualGuide, setManualGuide] = useState(0)
  const [interactive, setInteractive] = useState(0)
  const [crowdLevel, setCrowdLevel] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setName(editItem.name)
        setAddress(editItem.address)
        setX(editItem.x)
        setY(editItem.y)
        setHallType(editItem.hall_type || '历史')
        setBusinessHours(editItem.business_hours || '')
        setBookingHours(editItem.booking_hours || '')
        setCurrentCount(editItem.current_booking_count)
        setMaxCount(editItem.max_booking_count)
        setTheme(editItem.exhibition_theme || '')
        setTicketType(editItem.ticket_type)
        setTicketPrice(editItem.ticket_price ?? '')
        setManualGuide(editItem.manual_guide)
        setInteractive(editItem.interactive_project)
        setCrowdLevel(editItem.crowd_level)
      } else {
        setName(''); setAddress(''); setX(0); setY(0); setHallType('历史')
        setBusinessHours(''); setBookingHours(''); setCurrentCount(-1); setMaxCount(-1)
        setTheme(''); setTicketType(0); setTicketPrice(''); setManualGuide(0)
        setInteractive(0); setCrowdLevel(1)
      }
    }
  }, [isOpen, editItem])

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    const data: ExhibitionFormData = {
      name: name.trim(),
      address: address.trim() || '未知',
      x, y,
      hall_type: hallType || null,
      business_hours: businessHours || null,
      booking_hours: bookingHours || null,
      current_booking_count: currentCount,
      max_booking_count: maxCount,
      exhibition_theme: theme || null,
      ticket_type: ticketType,
      ticket_price: ticketPrice === '' ? null : ticketPrice,
      manual_guide: manualGuide,
      interactive_project: interactive,
      crowd_level: crowdLevel,
    }
    if (editItem) {
      await updateExhibition(editItem.id, data)
    } else {
      await createExhibition(data)
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
              <h2 className="text-lg font-medium text-slate-900">{editItem ? '编辑展馆' : '添加展馆'}</h2>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">名称 *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">地址</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">坐标 X</label>
                  <input type="number" value={x} onChange={(e) => setX(Number(e.target.value))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">坐标 Y</label>
                  <input type="number" value={y} onChange={(e) => setY(Number(e.target.value))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">展馆类型</label>
                  <select value={hallType} onChange={(e) => setHallType(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                    <option value="历史">历史</option>
                    <option value="艺术">艺术</option>
                    <option value="科技">科技</option>
                    <option value="自然">自然</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">展览主题</label>
                  <input type="text" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="古代中国基本陈列" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">营业时间</label>
                  <input type="text" value={businessHours} onChange={(e) => setBusinessHours(e.target.value)} placeholder="09:00-17:00" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">预约时段</label>
                  <input type="text" value={bookingHours} onChange={(e) => setBookingHours(e.target.value)} placeholder="不能预约" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">当前预约数</label>
                  <input type="number" value={currentCount} onChange={(e) => setCurrentCount(Number(e.target.value))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">最大预约数</label>
                  <input type="number" value={maxCount} onChange={(e) => setMaxCount(Number(e.target.value))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">门票类型</label>
                  <select value={ticketType} onChange={(e) => setTicketType(Number(e.target.value))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                    <option value={0}>免费</option>
                    <option value={1}>收费</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">门票价格</label>
                  <input type="number" value={ticketPrice} onChange={(e) => setTicketPrice(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">人工讲解</label>
                  <select value={manualGuide} onChange={(e) => setManualGuide(Number(e.target.value))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                    <option value={0}>无</option>
                    <option value={1}>有</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">互动体验</label>
                  <select value={interactive} onChange={(e) => setInteractive(Number(e.target.value))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                    <option value={0}>无</option>
                    <option value={1}>有</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">人流量（1=人少 2=适中 3=拥挤）</label>
                <select value={crowdLevel} onChange={(e) => setCrowdLevel(Number(e.target.value))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                  <option value={1}>人少</option>
                  <option value={2}>适中</option>
                  <option value={3}>拥挤</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">取消</button>
              <button onClick={handleSubmit} disabled={!name.trim() || submitting} className={`px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all ${name.trim() && !submitting ? 'bg-violet-500 hover:bg-violet-600 shadow-md shadow-violet-200' : 'bg-slate-300 cursor-not-allowed'}`}>
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

interface SelectOption {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}

function CustomSelect({ value, options, onChange }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedLabel = options.find(opt => opt.value === value)?.label || '全部'

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
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-2 bg-white border-2 rounded-xl text-sm font-medium transition-all cursor-pointer min-w-[100px] flex items-center gap-2 ${
          isOpen
            ? 'border-violet-400 ring-2 ring-violet-400/20'
            : 'border-slate-200 hover:border-violet-300'
        }`}
      >
        <span className={value ? 'text-slate-700' : 'text-slate-400'}>{selectedLabel}</span>
        <CaretDown
          size={16}
          className={`transition-transform ${isOpen ? 'rotate-180 text-violet-500' : 'text-slate-400'}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1.5 bg-white rounded-xl border border-violet-100 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.15)] py-1 z-50 min-w-[120px]"
          >
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  value === option.value
                    ? 'bg-violet-50 text-violet-700 font-medium'
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

function FilterBar({ filters, onFilterChange, resultCount }: FilterBarProps) {
  const handleReset = () => {
    onFilterChange({})
  }

  const hasActiveFilters = Object.keys(filters).length > 0
  const [collapsed, setCollapsed] = useState(true)

  const hallTypeOptions: SelectOption[] = [
    { value: '', label: '全部' },
    { value: '历史', label: '历史' },
    { value: '艺术', label: '艺术' },
    { value: '科技', label: '科技' },
    { value: '自然', label: '自然' },
  ]

  const ticketOptions: SelectOption[] = [
    { value: '', label: '全部' },
    { value: 'true', label: '免费' },
    { value: 'false', label: '收费' },
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
    <div className="sticky top-[57px] z-10 bg-gradient-to-r from-violet-50/95 via-white/95 to-violet-50/95 backdrop-blur-sm border-b border-violet-100/50 shadow-sm">
      <div className="max-w-5xl mx-auto px-6 py-4 space-y-4">
        <div className="flex items-center justify-center gap-4">
          <span className="text-sm text-slate-500 font-medium">筛选</span>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-xl hover:bg-violet-100 transition-colors"
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
              placeholder="搜索展馆名字..."
              value={filters.name || ''}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  name: e.target.value || undefined,
                })
              }
              className="w-56 px-4 py-2.5 bg-white border-2 border-violet-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 transition-all shadow-sm"
            />
          </div>
          <span className="text-sm text-slate-500">
            已找到 <span className="text-violet-600 font-bold text-base">{resultCount}</span> 个展馆
          </span>
          {hasActiveFilters && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleReset}
              className="px-3 py-1.5 text-sm text-violet-600 hover:text-violet-700 hover:bg-violet-100 rounded-full transition-all font-medium"
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
          className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-violet-100">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">展馆类型</span>
            <CustomSelect
              value={filters.hall_type || ''}
              options={hallTypeOptions}
              onChange={(val) =>
                onFilterChange({
                  ...filters,
                  hall_type: val || undefined,
                })
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">门票</span>
            <CustomSelect
              value={filters.free_entry !== undefined ? String(filters.free_entry) : ''}
              options={ticketOptions}
              onChange={(val) =>
                onFilterChange({
                  ...filters,
                  free_entry: val !== '' ? val === 'true' : undefined,
                })
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">距离</span>
            <CustomSelect
              value={filters.distance || ''}
              options={distanceOptions}
              onChange={(val) =>
                onFilterChange({
                  ...filters,
                  distance: val ? (val as FilterOptions['distance']) : undefined,
                })
              }
            />
          </div>

        </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  )
}

interface ExhibitionPageProps {
  onBack: () => void
}

export function ExhibitionPage({ onBack }: ExhibitionPageProps) {
  const [filters, setFilters] = useState<FilterOptions>({})
  const [displayCount, setDisplayCount] = useState(5)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [halls, setHalls] = useState<ExhibitionHall[]>([])
  const [total, setTotal] = useState(0)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ExhibitionHall | null>(null)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<ExhibitionHall | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('returnToAddPlan')
    if (!stored) return
    try {
      const data = JSON.parse(stored)
      if (data.locationTableName === 'exhibitions') {
        sessionStorage.removeItem('returnToAddPlan')
        setSelectedItem(data.item)
        setModalOpen(true)
      }
    } catch {}
  }, [])

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      const result = await deleteExhibition(id)
      if (result.code === 0) {
        setHalls(prev => prev.filter(h => h.id !== id))
        setTotal(prev => prev - 1)
      }
    } catch (error) {
      console.error('Failed to delete exhibition:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const fetchHalls = async () => {
    setIsFetching(true)
    try {
      const params: any = { page: 1, page_size: 100 }
      if (filters.name) params.name = filters.name
      if (filters.hall_type) params.hall_type = filters.hall_type
      if (filters.free_entry !== undefined) params.free_entry = filters.free_entry
      if (filters.distance) params.distance = filters.distance
      const response = await getExhibitions(params)
      setHalls(response.data.list)
      setTotal(response.data.total)
      setDisplayCount(Math.min(5, response.data.list.length))
    } catch (error) {
      console.error('Failed to fetch exhibitions:', error)
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => { fetchHalls() }, [filters])

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

  const displayedHalls = halls.slice(0, displayCount)
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
                  展馆展览
                </h1>
                <p className="text-xs text-slate-500">
                  已找到 {total} 个展馆
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setEditItem(null); setFormModalOpen(true) }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-500 text-white text-sm font-medium shadow-md shadow-violet-200 hover:bg-violet-600 transition-colors"
            >
              <Plus size={18} weight="bold" />
              添加展馆
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
              <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-sm ml-2">加载中...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="max-w-3xl mx-auto w-full px-4 py-4 space-y-4">
              {displayedHalls.map((hall) => (
                <div className={`relative ${deletingId === hall.id ? 'pointer-events-none opacity-50' : ''}`}>
                  <ExhibitionCard key={hall.id} hall={hall} onDelete={handleDelete} onEdit={() => { setEditItem(hall); setFormModalOpen(true) }} onAddToPlan={() => { setSelectedItem(hall); setModalOpen(true) }} />
                  {deletingId === hall.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm text-slate-400">删除中...</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {total === 0 && (
              <div className="text-center py-16">
                <p className="text-slate-400 text-lg">没有找到符合条件的展馆</p>
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

            {!isLoading && hasMore === false && displayedHalls.length > 0 && (
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
          locationTableName="exhibitions"
          theme="violet"
        />
      )}

      <ExhibitionFormModal
        isOpen={formModalOpen}
        editItem={editItem}
        onClose={() => { setFormModalOpen(false); setEditItem(null) }}
        onSaved={fetchHalls}
      />
    </div>
  )
}
