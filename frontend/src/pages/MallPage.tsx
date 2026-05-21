'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, CaretDown } from '@phosphor-icons/react'
import { getMalls, type Mall } from '../mock/api'

interface FilterOptions {
  name?: string
  cinema_has?: number
  supermarket_has?: number
  discount_status?: number
  distance?: '<200m' | '<500m' | '<1.0km' | '<2.0km' | 'other'
}

interface MallCardProps {
  mall: Mall
  onClick?: () => void
}

function MallCard({ mall, onClick }: MallCardProps) {
  const distance = Math.abs(mall.x) + Math.abs(mall.y)
  const distanceText = distance >= 1000 ? `${(distance / 1000).toFixed(1)}km` : `${distance}m`

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
              {mall.name}
            </h3>
            <p className="text-sm text-slate-500 mt-1 truncate">
              {mall.address}
            </p>
          </div>
          <span className="shrink-0 ml-2 px-2.5 py-1 bg-pink-50 text-pink-600 text-xs font-medium rounded-lg whitespace-nowrap">
            {distanceText}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <span className={`px-2 py-0.5 text-xs rounded-md whitespace-nowrap ${
            mall.cinema_has ? 'bg-purple-50 text-purple-600' : 'bg-slate-50 text-slate-400'
          }`}>
            {mall.cinema_has ? '有影院' : '无影院'}
          </span>
          <span className={`px-2 py-0.5 text-xs rounded-md whitespace-nowrap ${
            mall.supermarket_has ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'
          }`}>
            {mall.supermarket_has ? '有超市' : '无超市'}
          </span>
          <span className={`px-2 py-0.5 text-xs rounded-md whitespace-nowrap ${
            mall.discount_status ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'
          }`}>
            {mall.discount_status ? '有优惠' : '无优惠'}
          </span>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            购物休闲，一站式体验
          </p>
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
            ? 'border-pink-400 ring-2 ring-pink-400/20'
            : 'border-slate-200 hover:border-pink-300'
        }`}
      >
        <span className={value ? 'text-slate-700' : 'text-slate-400'}>{selectedLabel}</span>
        <CaretDown
          size={16}
          className={`transition-transform ${isOpen ? 'rotate-180 text-pink-500' : 'text-slate-400'}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1.5 bg-white rounded-xl border border-pink-100 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.15)] py-1 z-50 min-w-[120px]"
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
                    ? 'bg-pink-50 text-pink-700 font-medium'
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

  const yesNoOptions: SelectOption[] = [
    { value: '', label: '全部' },
    { value: '1', label: '有' },
    { value: '0', label: '无' },
  ]

  const discountOptions: SelectOption[] = [
    { value: '', label: '全部' },
    { value: '1', label: '有优惠' },
    { value: '0', label: '无优惠' },
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
    <div className="sticky top-[57px] z-10 bg-gradient-to-r from-pink-50/95 via-white/95 to-pink-50/95 backdrop-blur-sm border-b border-pink-100/50 shadow-sm">
      <div className="max-w-5xl mx-auto px-6 py-4 space-y-4">
        <div className="flex items-center justify-center gap-4">
          <span className="text-sm text-slate-500 font-medium">筛选</span>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-xl hover:bg-pink-100 transition-colors"
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
              placeholder="搜索商场名字..."
              value={filters.name || ''}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  name: e.target.value || undefined,
                })
              }
              className="w-56 px-4 py-2.5 bg-white border-2 border-pink-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition-all shadow-sm"
            />
          </div>
          <span className="text-sm text-slate-500">
            已找到 <span className="text-pink-600 font-bold text-base">{resultCount}</span> 个商场
          </span>
          {hasActiveFilters && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleReset}
              className="px-3 py-1.5 text-sm text-pink-600 hover:text-pink-700 hover:bg-pink-100 rounded-full transition-all font-medium"
            >
              ✕ 重置
            </motion.button>
          )}
        </div>

        <motion.div
          animate={{ maxHeight: collapsed ? 0 : 500, opacity: collapsed ? 0 : 1 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className={collapsed ? 'overflow-hidden' : ''}
        >
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-pink-100">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">影院</span>
              <CustomSelect
                value={filters.cinema_has !== undefined ? String(filters.cinema_has) : ''}
                options={yesNoOptions}
                onChange={(val) =>
                  onFilterChange({
                    ...filters,
                    cinema_has: val !== '' ? Number(val) : undefined,
                  })
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">大型超市</span>
              <CustomSelect
                value={filters.supermarket_has !== undefined ? String(filters.supermarket_has) : ''}
                options={yesNoOptions}
                onChange={(val) =>
                  onFilterChange({
                    ...filters,
                    supermarket_has: val !== '' ? Number(val) : undefined,
                  })
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">优惠活动</span>
              <CustomSelect
                value={filters.discount_status !== undefined ? String(filters.discount_status) : ''}
                options={discountOptions}
                onChange={(val) =>
                  onFilterChange({
                    ...filters,
                    discount_status: val !== '' ? Number(val) : undefined,
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
          </div>
        </motion.div>
      </div>
    </div>
  )
}

interface MallPageProps {
  onBack: () => void
}

export function MallPage({ onBack }: MallPageProps) {
  const [filters, setFilters] = useState<FilterOptions>({})
  const [displayCount, setDisplayCount] = useState(5)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [malls, setMalls] = useState<Mall[]>([])
  const [total, setTotal] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // 调用 Mock API 获取数据
  useEffect(() => {
    const fetchMalls = async () => {
      setIsFetching(true)
      try {
        const params: any = {
          page: 1,
          page_size: 100,
        }
        if (filters.name) params.name = filters.name
        if (filters.cinema_has !== undefined) params.cinema_has = filters.cinema_has
        if (filters.supermarket_has !== undefined) params.supermarket_has = filters.supermarket_has
        if (filters.discount_status !== undefined) params.discount_status = filters.discount_status
        if (filters.distance) params.distance = filters.distance

        const response = await getMalls(params)
        setMalls(response.data.list)
        setTotal(response.data.total)
        setDisplayCount(Math.min(5, response.data.list.length))
      } catch (error) {
        console.error('Failed to fetch malls:', error)
      } finally {
        setIsFetching(false)
      }
    }

    fetchMalls()
  }, [filters])

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

  const displayedMalls = malls.slice(0, displayCount)
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
                  商场筛选
                </h1>
                <p className="text-xs text-slate-500">
                  已找到 {total} 个商场
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
              <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-sm ml-2">加载中...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="max-w-3xl mx-auto w-full px-4 py-4 space-y-4">
              {displayedMalls.map((mall) => (
                <MallCard key={mall.id} mall={mall} />
              ))}
            </div>

            {total === 0 && (
              <div className="text-center py-16">
                <p className="text-slate-400 text-lg">没有找到符合条件的商场</p>
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

            {!isLoading && hasMore === false && displayedMalls.length > 0 && (
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
