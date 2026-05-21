'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, CaretDown } from '@phosphor-icons/react'
import { getExhibitions, type ExhibitionHall } from '../mock/api'

interface FilterOptions {
  name?: string
  hall_type?: string
  ticket_type?: number
  crowd_level?: number
  can_book?: boolean
  manual_guide?: number
  interactive_project?: number
  distance?: '<200m' | '<500m' | '<1.0km' | '<2.0km' | 'other'
}

interface ExhibitionCardProps {
  hall: ExhibitionHall
  onClick?: () => void
}

function ExhibitionCard({ hall, onClick }: ExhibitionCardProps) {
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
      className="bg-white rounded-2xl border border-slate-200/50 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)] overflow-hidden cursor-pointer hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)] transition-shadow"
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
          <span className="shrink-0 ml-2 px-2.5 py-1 bg-violet-50 text-violet-600 text-xs font-medium rounded-lg whitespace-nowrap">
            {distanceText}
          </span>
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
      </div>
    </motion.div>
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
    { value: '0', label: '免费' },
    { value: '1', label: '收费' },
  ]

  const crowdOptions: SelectOption[] = [
    { value: '', label: '全部' },
    { value: '1', label: '人少' },
    { value: '2', label: '适中' },
    { value: '3', label: '拥挤' },
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
              value={filters.ticket_type !== undefined ? String(filters.ticket_type) : ''}
              options={ticketOptions}
              onChange={(val) =>
                onFilterChange({
                  ...filters,
                  ticket_type: val !== '' ? Number(val) : undefined,
                })
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">人流量</span>
            <CustomSelect
              value={filters.crowd_level !== undefined ? String(filters.crowd_level) : ''}
              options={crowdOptions}
              onChange={(val) =>
                onFilterChange({
                  ...filters,
                  crowd_level: val !== '' ? Number(val) : undefined,
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

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                onFilterChange({
                  ...filters,
                  can_book: filters.can_book ? undefined : true,
                })
              }
              className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all cursor-pointer ${
                filters.can_book
                  ? 'bg-violet-50 border-violet-400 text-violet-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-violet-300'
              }`}
            >
              可预约
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                onFilterChange({
                  ...filters,
                  manual_guide: filters.manual_guide === 1 ? undefined : 1,
                })
              }
              className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all cursor-pointer ${
                filters.manual_guide === 1
                  ? 'bg-violet-50 border-violet-400 text-violet-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-violet-300'
              }`}
            >
              人工讲解
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                onFilterChange({
                  ...filters,
                  interactive_project: filters.interactive_project === 1 ? undefined : 1,
                })
              }
              className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all cursor-pointer ${
                filters.interactive_project === 1
                  ? 'bg-violet-50 border-violet-400 text-violet-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-violet-300'
              }`}
            >
              互动体验
            </button>
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
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchHalls = async () => {
      setIsFetching(true)
      try {
        const params: any = { page: 1, page_size: 100 }
        if (filters.name) params.name = filters.name
        if (filters.hall_type) params.hall_type = filters.hall_type
        if (filters.ticket_type !== undefined) params.ticket_type = filters.ticket_type
        if (filters.crowd_level !== undefined) params.crowd_level = filters.crowd_level
        if (filters.can_book !== undefined) params.can_book = filters.can_book
        if (filters.manual_guide !== undefined) params.manual_guide = filters.manual_guide
        if (filters.interactive_project !== undefined) params.interactive_project = filters.interactive_project
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

    fetchHalls()
  }, [filters])

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
                <ExhibitionCard key={hall.id} hall={hall} />
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
    </div>
  )
}
