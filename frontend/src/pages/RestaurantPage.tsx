'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, CaretDown } from '@phosphor-icons/react'
import { getRestaurants, type Restaurant } from '../mock/api'

const DiningStyle = {
  DINE_IN: 0,
  TAKEOUT: 1,
  BOTH: 2,
} as const

type DiningStyleType = typeof DiningStyle[keyof typeof DiningStyle]

const DINING_STYLE_LABELS: Record<DiningStyleType, string> = {
  [DiningStyle.DINE_IN]: '堂食',
  [DiningStyle.TAKEOUT]: '外卖',
  [DiningStyle.BOTH]: '均可',
}

const CUISINE_TYPES = ['中餐', '西餐', '日料', '火锅', '烧烤', '快餐', '其他'] as const
type CuisineType = (typeof CUISINE_TYPES)[number]

interface FilterOptions {
  name?: string
  cuisine_type?: CuisineType
  dining_style?: DiningStyleType
  can_book?: boolean
  distance?: '<200m' | '<500m' | '<1.0km' | '<2.0km' | 'other'
}

interface RestaurantCardProps {
  restaurant: Restaurant
  onClick?: () => void
}

function RestaurantCard({ restaurant, onClick }: RestaurantCardProps) {
  const distance = Math.abs(restaurant.x) + Math.abs(restaurant.y)
  const distanceText = distance >= 1000 ? `${(distance / 1000).toFixed(1)}km` : `${distance}m`
  const isBookable = restaurant.booking_hours !== '不能预约' && restaurant.booking_hours !== null
  const hasQueue = restaurant.queue_time > 0

  const diningStyleLabel = DINING_STYLE_LABELS[restaurant.dining_style as DiningStyleType]

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
              {restaurant.name}
            </h3>
            <p className="text-sm text-slate-500 mt-1 truncate">
              {restaurant.address}
            </p>
          </div>
          <span className="shrink-0 ml-2 px-2.5 py-1 bg-orange-50 text-orange-600 text-xs font-medium rounded-lg whitespace-nowrap">
            {distanceText}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md whitespace-nowrap">
            {restaurant.cuisine_type}
          </span>
          <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-xs rounded-md whitespace-nowrap">
            {diningStyleLabel}
          </span>
          {isBookable && (
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-md whitespace-nowrap">
              可预约
            </span>
          )}
          {restaurant.tags.slice(0, 3).map((tag: string, i: number) => (
            <span key={i} className="px-2 py-0.5 bg-slate-50 text-slate-500 text-xs rounded-md whitespace-nowrap">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="truncate">营业时间：{restaurant.business_hours}</span>
          {hasQueue && (
            <span className="text-red-400 shrink-0 ml-2 whitespace-nowrap">排队约 {restaurant.queue_time}分钟</span>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 min-h-[20px]">
          {isBookable ? (
            <div className="flex items-center text-xs text-slate-500 flex-wrap gap-2">
              <span className="whitespace-nowrap">预约时段：{restaurant.booking_hours}</span>
              {restaurant.max_booking_count > 0 && (
                <span className="whitespace-nowrap">
                  剩余名额：{Math.max(0, restaurant.max_booking_count - restaurant.current_booking_count)}
                </span>
              )}
            </div>
          ) : hasQueue ? (
            <div className="text-xs text-slate-400">
              现场排队取号
            </div>
          ) : (
            <div className="text-xs text-slate-400">
              无需预约，无需排队
            </div>
          )}
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
            ? 'border-orange-400 ring-2 ring-orange-400/20'
            : 'border-slate-200 hover:border-orange-300'
        }`}
      >
        <span className={value ? 'text-slate-700' : 'text-slate-400'}>{selectedLabel}</span>
        <CaretDown
          size={16}
          className={`transition-transform ${isOpen ? 'rotate-180 text-orange-500' : 'text-slate-400'}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1.5 bg-white rounded-xl border border-orange-100 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.15)] py-1 z-50 min-w-[120px]"
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
                    ? 'bg-orange-50 text-orange-700 font-medium'
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

  const cuisineOptions: SelectOption[] = [
    { value: '', label: '全部' },
    ...CUISINE_TYPES.map((cuisine) => ({ value: cuisine, label: cuisine })),
  ]

  const diningStyleOptions: SelectOption[] = [
    { value: '', label: '全部' },
    { value: String(DiningStyle.DINE_IN), label: '堂食' },
    { value: String(DiningStyle.TAKEOUT), label: '外卖' },
    { value: String(DiningStyle.BOTH), label: '均可' },
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
    <div className="sticky top-[57px] z-10 bg-gradient-to-r from-orange-50/95 via-white/95 to-orange-50/95 backdrop-blur-sm border-b border-orange-100/50 shadow-sm">
      <div className="max-w-5xl mx-auto px-6 py-4 space-y-4">
        <div className="flex items-center justify-center gap-4">
          <span className="text-sm text-slate-500 font-medium">筛选</span>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-xl hover:bg-orange-100 transition-colors"
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
              placeholder="🔍 搜索餐厅名字..."
              value={filters.name || ''}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  name: e.target.value || undefined,
                })
              }
              className="w-56 px-4 py-2.5 bg-white border-2 border-orange-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all shadow-sm"
            />
          </div>
          <span className="text-sm text-slate-500">
            已找到 <span className="text-orange-600 font-bold text-base">{resultCount}</span> 家餐厅
          </span>
          {hasActiveFilters && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleReset}
              className="px-3 py-1.5 text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-100 rounded-full transition-all font-medium"
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
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-orange-100">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">菜系</span>
              <CustomSelect
                value={filters.cuisine_type || ''}
                options={cuisineOptions}
                onChange={(val) =>
                  onFilterChange({
                    ...filters,
                    cuisine_type: val ? (val as CuisineType) : undefined,
                  })
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">用餐方式</span>
              <CustomSelect
                value={filters.dining_style !== undefined ? String(filters.dining_style) : ''}
                options={diningStyleOptions}
                onChange={(val) =>
                  onFilterChange({
                    ...filters,
                    dining_style: val ? Number(val) as DiningStyleType : undefined,
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
              <span className="text-xs text-slate-400 font-medium">预约</span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    can_book: filters.can_book === true ? undefined : true,
                  })
                }
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm ${
                  filters.can_book === true
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-blue-200'
                    : 'bg-white text-slate-600 hover:bg-blue-50 border-2 border-slate-200'
                }`}
              >
                可预约
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

interface RestaurantPageProps {
  onBack: () => void
}

export function RestaurantPage({ onBack }: RestaurantPageProps) {
  const [filters, setFilters] = useState<FilterOptions>({})
  const [displayCount, setDisplayCount] = useState(5)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [total, setTotal] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // 调用 Mock API 获取数据
  useEffect(() => {
    const fetchRestaurants = async () => {
      setIsFetching(true)
      try {
        const params: any = {
          page: 1,
          page_size: 100, // 一次性获取全部数据，由前端 displayCount 控制逐步展示
        }
        if (filters.name) params.name = filters.name
        if (filters.cuisine_type) params.cuisine_type = filters.cuisine_type
        if (filters.dining_style !== undefined) params.dining_style = filters.dining_style
        if (filters.can_book !== undefined) params.can_book = filters.can_book
        if (filters.distance) params.distance = filters.distance

        const response = await getRestaurants(params)
        setRestaurants(response.data.list)
        setTotal(response.data.total)
        setDisplayCount(Math.min(5, response.data.list.length))
      } catch (error) {
        console.error('Failed to fetch restaurants:', error)
      } finally {
        setIsFetching(false)
      }
    }

    fetchRestaurants()
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

  const displayedRestaurants = restaurants.slice(0, displayCount)
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
                  餐厅筛选
                </h1>
                <p className="text-xs text-slate-500">
                  已找到 {total} 家餐厅
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
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-sm ml-2">加载中...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="max-w-3xl mx-auto w-full px-4 py-4 space-y-4">
              {displayedRestaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>

            {total === 0 && (
              <div className="text-center py-16">
                <p className="text-slate-400 text-lg">没有找到符合条件的餐厅</p>
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

            {!isLoading && hasMore === false && displayedRestaurants.length > 0 && (
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
