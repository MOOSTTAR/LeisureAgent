'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, CaretDown, Trash, Plus } from '@phosphor-icons/react'
import { getAmusementParks, deleteAmusementPark, type AmusementPark } from '../mock/api'
import { AddToPlanModal } from '../components/AddToPlanModal'

interface FilterOptions {
  name?: string
  park_theme?: string
  can_book?: boolean
  distance?: '<200m' | '<500m' | '<1.0km' | '<2.0km' | 'other'
}

interface AmusementParkCardProps {
  park: AmusementPark
  onDelete?: (id: number) => void
  onClick?: () => void
  onAddToPlan?: () => void
}

function AmusementParkCard({ park, onDelete, onClick, onAddToPlan }: AmusementParkCardProps) {
  const distance = Math.abs(park.x) + Math.abs(park.y)
  const distanceText = distance >= 1000 ? `${(distance / 1000).toFixed(1)}km` : `${distance}m`
  const canBook = park.booking_hours !== '不能预约'
  const hasQueue = park.queue_time > 0

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
              onClick={(e) => { e.stopPropagation(); onDelete?.(park.id) }}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              title="删除乐园"
            >
              <Trash size={16} />
            </motion.button>
            <span className="px-2.5 py-1 bg-amber-50 text-amber-600 text-xs font-medium rounded-lg whitespace-nowrap">
              {distanceText}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {park.park_theme && (
            <span className="px-2 py-0.5 text-xs rounded-md whitespace-nowrap bg-amber-50 text-amber-700">
              {park.park_theme}
            </span>
          )}
          <span className="px-2 py-0.5 text-xs rounded-md whitespace-nowrap bg-yellow-50 text-yellow-700">
            {park.ticket_price === 0 ? '免费' : `¥${park.ticket_price}`}
          </span>
          {canBook && (
            <span className="px-2 py-0.5 text-xs rounded-md whitespace-nowrap bg-blue-50 text-blue-600">
              可预约（{park.current_booking_count}/{park.max_booking_count}）
            </span>
          )}
          {hasQueue && (
            <span className="px-2 py-0.5 text-xs rounded-md whitespace-nowrap bg-red-50 text-red-500">
              排队约 {park.queue_time}分钟
            </span>
          )}
        </div>

        {park.performance_info && (
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              演出：{park.performance_info}
            </p>
          </div>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onAddToPlan?.() }}
          className="w-full mt-3 py-2 rounded-xl text-sm font-medium border-2 border-dashed border-amber-300 text-amber-600 hover:bg-amber-50 hover:border-solid transition-all flex items-center justify-center gap-1.5"
        >
          <Plus size={14} />
          添加到计划
        </button>
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
            ? 'border-amber-400 ring-2 ring-amber-400/20'
            : 'border-slate-200 hover:border-amber-300'
        }`}
      >
        <span className={value ? 'text-slate-700' : 'text-slate-400'}>{selectedLabel}</span>
        <CaretDown
          size={16}
          className={`transition-transform ${isOpen ? 'rotate-180 text-amber-500' : 'text-slate-400'}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1.5 bg-white rounded-xl border border-amber-100 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.15)] py-1 z-50 min-w-[120px]"
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
                    ? 'bg-amber-50 text-amber-700 font-medium'
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

  const themeOptions: SelectOption[] = [
    { value: '', label: '全部' },
    { value: '童话', label: '童话' },
    { value: '海洋', label: '海洋' },
    { value: '科幻', label: '科幻' },
    { value: '卡通', label: '卡通' },
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
    <div className="sticky top-[57px] z-10 bg-gradient-to-r from-amber-50/95 via-white/95 to-amber-50/95 backdrop-blur-sm border-b border-amber-100/50 shadow-sm">
      <div className="max-w-5xl mx-auto px-6 py-4 space-y-4">
        <div className="flex items-center justify-center gap-4">
          <span className="text-sm text-slate-500 font-medium">筛选</span>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-xl hover:bg-amber-100 transition-colors"
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
              placeholder="搜索乐园名字..."
              value={filters.name || ''}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  name: e.target.value || undefined,
                })
              }
              className="w-56 px-4 py-2.5 bg-white border-2 border-amber-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all shadow-sm"
            />
          </div>
          <span className="text-sm text-slate-500">
            已找到 <span className="text-amber-600 font-bold text-base">{resultCount}</span> 个乐园
          </span>
          {hasActiveFilters && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleReset}
              className="px-3 py-1.5 text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-100 rounded-full transition-all font-medium"
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
          className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-amber-100">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">主题</span>
            <CustomSelect
              value={filters.park_theme || ''}
              options={themeOptions}
              onChange={(val) =>
                onFilterChange({
                  ...filters,
                  park_theme: val || undefined,
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

          <button
            onClick={() =>
              onFilterChange({
                ...filters,
                can_book: filters.can_book ? undefined : true,
              })
            }
            className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all cursor-pointer ${
              filters.can_book
                ? 'bg-amber-50 border-amber-400 text-amber-700'
                : 'bg-white border-slate-200 text-slate-500 hover:border-amber-300'
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

interface AmusementParkPageProps {
  onBack: () => void
}

export function AmusementParkPage({ onBack }: AmusementParkPageProps) {
  const [filters, setFilters] = useState<FilterOptions>({})
  const [displayCount, setDisplayCount] = useState(5)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [parks, setParks] = useState<AmusementPark[]>([])
  const [total, setTotal] = useState(0)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<AmusementPark | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      const result = await deleteAmusementPark(id)
      if (result.code === 0) {
        setParks(prev => prev.filter(p => p.id !== id))
        setTotal(prev => prev - 1)
      }
    } catch (error) {
      console.error('Failed to delete amusement park:', error)
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    const fetchParks = async () => {
      setIsFetching(true)
      try {
        const params: any = { page: 1, page_size: 100 }
        if (filters.name) params.name = filters.name
        if (filters.park_theme) params.park_theme = filters.park_theme
        if (filters.can_book !== undefined) params.can_book = filters.can_book
        if (filters.distance) params.distance = filters.distance

        const response = await getAmusementParks(params)
        setParks(response.data.list)
        setTotal(response.data.total)
        setDisplayCount(Math.min(5, response.data.list.length))
      } catch (error) {
        console.error('Failed to fetch amusement parks:', error)
      } finally {
        setIsFetching(false)
      }
    }

    fetchParks()
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
                  游乐园/主题乐园
                </h1>
                <p className="text-xs text-slate-500">
                  已找到 {total} 个乐园
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
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-sm ml-2">加载中...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="max-w-3xl mx-auto w-full px-4 py-4 space-y-4">
              {displayedParks.map((park) => (
                <div key={park.id} className={`relative ${deletingId === park.id ? 'pointer-events-none opacity-50' : ''}`}>
                  <AmusementParkCard park={park} onDelete={handleDelete} onAddToPlan={() => { setSelectedItem(park); setModalOpen(true) }} />
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
                <p className="text-slate-400 text-lg">没有找到符合条件的乐园</p>
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
            queue_time: selectedItem.queue_time,
          }}
          locationTableName="amusement_parks"
          theme="amber"
        />
      )}
    </div>
  )
}
