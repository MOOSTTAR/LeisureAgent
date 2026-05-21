'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, CaretDown } from '@phosphor-icons/react'

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

interface Restaurant {
  id: number
  name: string
  address: string
  x: number
  y: number
  cuisine_type: CuisineType | null
  dining_style: DiningStyleType
  tags: string[]
  business_hours: string | null
  booking_hours: string | null
  current_booking_count: number
  max_booking_count: number
  queue_time: number
  indoor_env: string | null
}

interface FilterOptions {
  name?: string
  cuisine_type?: CuisineType
  dining_style?: DiningStyleType
  can_book?: boolean
  distance?: '<200m' | '<500m' | '<1.0km' | '<2.0km' | 'other'
}

const MOCK_RESTAURANTS: Restaurant[] = [
  {
    id: 1,
    name: '海底捞火锅',
    address: '朝阳区建国路 93 号万达广场 3 层',
    x: 500,
    y: 300,
    cuisine_type: '火锅',
    dining_style: DiningStyle.BOTH,
    tags: ['网红店', '服务好'],
    business_hours: '10:00-22:00',
    booking_hours: '10:00-21:00',
    current_booking_count: 15,
    max_booking_count: 50,
    queue_time: -1,
    indoor_env: '宽敞明亮，有包间',
  },
  {
    id: 2,
    name: '外婆家',
    address: '海淀区中关村大街 1 号海雅百货 5 层',
    x: 800,
    y: 600,
    cuisine_type: '中餐',
    dining_style: DiningStyle.DINE_IN,
    tags: ['家常菜', '性价比高'],
    business_hours: '10:30-21:30',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    queue_time: 15,
    indoor_env: '温馨舒适',
  },
  {
    id: 3,
    name: '寿司一郎',
    address: '东城区王府井大街 138 号',
    x: 200,
    y: 150,
    cuisine_type: '日料',
    dining_style: DiningStyle.BOTH,
    tags: ['精致', '高档', 'Omakase'],
    business_hours: '11:30-14:00,17:30-21:30',
    booking_hours: '11:00-20:00',
    current_booking_count: 8,
    max_booking_count: 20,
    queue_time: -1,
    indoor_env: '日式简约风格',
  },
  {
    id: 4,
    name: '麦当劳',
    address: '西城区西单北大街 130 号',
    x: 350,
    y: 250,
    cuisine_type: '快餐',
    dining_style: DiningStyle.BOTH,
    tags: ['快捷', '便宜'],
    business_hours: '06:00-23:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    queue_time: -1,
    indoor_env: '标准快餐店装修',
  },
  {
    id: 5,
    name: '蜀大侠火锅',
    address: '朝阳区工体北路 6 号',
    x: 1200,
    y: 800,
    cuisine_type: '火锅',
    dining_style: DiningStyle.DINE_IN,
    tags: ['川味', '辣', '人气高'],
    business_hours: '11:00-23:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    queue_time: 60,
    indoor_env: '江湖风装修',
  },
  {
    id: 6,
    name: '必胜客',
    address: '丰台区南三环西路 16 号',
    x: 1500,
    y: 1000,
    cuisine_type: '西餐',
    dining_style: DiningStyle.BOTH,
    tags: ['披萨', '家庭聚餐'],
    business_hours: '10:00-22:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    queue_time: -1,
    indoor_env: '美式休闲风格',
  },
  {
    id: 7,
    name: '江边城外烤鱼',
    address: '朝阳区朝阳北路 101 号',
    x: 700,
    y: 450,
    cuisine_type: '中餐',
    dining_style: DiningStyle.DINE_IN,
    tags: ['烤鱼', '宵夜'],
    business_hours: '11:00-02:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    queue_time: 20,
    indoor_env: '大排档风格',
  },
  {
    id: 8,
    name: '星巴克',
    address: '海淀区丹棱街 5 号',
    x: 100,
    y: 80,
    cuisine_type: '其他',
    dining_style: DiningStyle.TAKEOUT,
    tags: ['咖啡', '商务', '安静'],
    business_hours: '07:00-21:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    queue_time: -1,
    indoor_env: '商务休闲',
  },
  {
    id: 9,
    name: '全聚德烤鸭店',
    address: '东城区前门大街 32 号',
    x: 400,
    y: 350,
    cuisine_type: '中餐',
    dining_style: DiningStyle.DINE_IN,
    tags: ['北京烤鸭', '老字号', '宴请'],
    business_hours: '10:30-21:00',
    booking_hours: '10:00-20:00',
    current_booking_count: 45,
    max_booking_count: 80,
    queue_time: -1,
    indoor_env: '传统中式装修',
  },
  {
    id: 10,
    name: '韩式烤肉馆',
    address: '朝阳区望京街 9 号',
    x: 1800,
    y: 1200,
    cuisine_type: '其他',
    dining_style: DiningStyle.BOTH,
    tags: ['韩式', '烤肉', '夜宵'],
    business_hours: '11:30-03:00',
    booking_hours: '11:30-02:00',
    current_booking_count: 25,
    max_booking_count: 50,
    queue_time: -1,
    indoor_env: '韩式简约风',
  },
  {
    id: 11,
    name: '小龙坎老火锅',
    address: '西城区新街口北大街 1 号',
    x: 600,
    y: 400,
    cuisine_type: '火锅',
    dining_style: DiningStyle.BOTH,
    tags: ['重庆火锅', '辣', '排队'],
    business_hours: '11:00-23:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    queue_time: 50,
    indoor_env: '复古风',
  },
  {
    id: 12,
    name: '西贝莜面村',
    address: '海淀区成府路 28 号',
    x: 900,
    y: 700,
    cuisine_type: '中餐',
    dining_style: DiningStyle.DINE_IN,
    tags: ['西北菜', '健康', '家庭'],
    business_hours: '10:00-21:30',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    queue_time: 10,
    indoor_env: '简约温馨',
  },
  {
    id: 13,
    name: '肯德基',
    address: '东城区东长安街 1 号',
    x: 250,
    y: 200,
    cuisine_type: '快餐',
    dining_style: DiningStyle.BOTH,
    tags: ['快餐', '早餐', '便捷'],
    business_hours: '06:00-24:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    queue_time: -1,
    indoor_env: '标准快餐店',
  },
  {
    id: 14,
    name: '天福楼',
    address: '朝阳区建国门外大街 1 号',
    x: 550,
    y: 280,
    cuisine_type: '中餐',
    dining_style: DiningStyle.DINE_IN,
    tags: ['粤菜', '早茶', '高档'],
    business_hours: '07:00-22:00',
    booking_hours: '07:00-21:00',
    current_booking_count: 40,
    max_booking_count: 100,
    queue_time: -1,
    indoor_env: '豪华粤式装修',
  },
  {
    id: 15,
    name: '烤肉之家',
    address: '丰台区方庄南路 2 号',
    x: 2000,
    y: 1500,
    cuisine_type: '烧烤',
    dining_style: DiningStyle.DINE_IN,
    tags: ['烤肉', '宵夜', '啤酒'],
    business_hours: '16:00-04:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    queue_time: 15,
    indoor_env: '工业风',
  },
  {
    id: 16,
    name: '茶餐厅 1988',
    address: '朝阳区三里屯路 19 号',
    x: 480,
    y: 320,
    cuisine_type: '其他',
    dining_style: DiningStyle.BOTH,
    tags: ['港式', '茶餐厅', '怀旧'],
    business_hours: '10:00-22:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    queue_time: 20,
    indoor_env: '怀旧港风',
  },
  {
    id: 17,
    name: '拉面馆',
    address: '海淀区中关村南大街 2 号',
    x: 850,
    y: 650,
    cuisine_type: '中餐',
    dining_style: DiningStyle.DINE_IN,
    tags: ['兰州拉面', '清真', '实惠'],
    business_hours: '06:30-21:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    queue_time: 5,
    indoor_env: '简洁干净',
  },
  {
    id: 18,
    name: 'Pizza Hut',
    address: '西城区金融大街 1 号',
    x: 300,
    y: 180,
    cuisine_type: '西餐',
    dining_style: DiningStyle.BOTH,
    tags: ['披萨', '意面', '家庭'],
    business_hours: '10:00-22:00',
    booking_hours: '10:00-21:00',
    current_booking_count: 12,
    max_booking_count: 30,
    queue_time: -1,
    indoor_env: '休闲西式',
  },
  {
    id: 19,
    name: '呷哺呷哺',
    address: '朝阳区朝阳门外大街 8 号',
    x: 420,
    y: 290,
    cuisine_type: '火锅',
    dining_style: DiningStyle.DINE_IN,
    tags: ['小火锅', '快餐', '一人食'],
    business_hours: '10:00-22:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    queue_time: 10,
    indoor_env: '简约快餐风',
  },
  {
    id: 20,
    name: '日料居酒屋',
    address: '朝阳区工体西路 5 号',
    x: 1100,
    y: 750,
    cuisine_type: '日料',
    dining_style: DiningStyle.DINE_IN,
    tags: ['居酒屋', '烧鸟', '夜宵'],
    business_hours: '17:00-02:00',
    booking_hours: '17:00-01:00',
    current_booking_count: 22,
    max_booking_count: 40,
    queue_time: -1,
    indoor_env: '日式和风',
  },
]

function getDistanceValue(x: number, y: number): number {
  return Math.abs(x) + Math.abs(y)
}

function canBook(bookingHours: string | null): boolean {
  return bookingHours !== null && bookingHours !== '不能预约'
}

interface RestaurantCardProps {
  restaurant: Restaurant
  onClick?: () => void
}

function RestaurantCard({ restaurant, onClick }: RestaurantCardProps) {
  const distance = getDistanceValue(restaurant.x, restaurant.y)
  const distanceText = distance >= 1000 ? `${(distance / 1000).toFixed(1)}km` : `${distance}m`
  const isBookable = canBook(restaurant.booking_hours)
  const hasQueue = restaurant.queue_time > 0

  const diningStyleLabel = DINING_STYLE_LABELS[restaurant.dining_style]

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
          <span className="shrink-0 ml-2 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-lg whitespace-nowrap">
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
          {restaurant.tags.slice(0, 3).map((tag, i) => (
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

// 自定义下拉选项组件
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
            ? 'border-emerald-400 ring-2 ring-emerald-400/20'
            : 'border-slate-200 hover:border-emerald-300'
        }`}
      >
        <span className={value ? 'text-slate-700' : 'text-slate-400'}>{selectedLabel}</span>
        <CaretDown
          size={16}
          className={`transition-transform ${isOpen ? 'rotate-180 text-emerald-500' : 'text-slate-400'}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1.5 bg-white rounded-xl border border-emerald-100 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.15)] py-1 z-50 min-w-[120px]"
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
                    ? 'bg-emerald-50 text-emerald-700 font-medium'
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
    <div className="sticky top-[57px] z-10 bg-gradient-to-r from-emerald-50/95 via-white/95 to-emerald-50/95 backdrop-blur-sm border-b border-emerald-100/50 shadow-sm">
      <div className="max-w-5xl mx-auto px-6 py-4 space-y-4">
        <div className="flex items-center justify-center gap-4">
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
              className="w-56 px-4 py-2.5 bg-white border-2 border-emerald-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all shadow-sm"
            />
          </div>
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

        <div className="text-center">
          <span className="text-sm text-slate-500">
            已找到 <span className="text-emerald-600 font-bold text-base">{resultCount}</span> 家餐厅
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-emerald-100">
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
              📅 可预约
            </motion.button>
          </div>
        </div>
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
  const containerRef = useRef<HTMLDivElement>(null)

  const filteredRestaurants = MOCK_RESTAURANTS.filter((restaurant) => {
    if (filters.name && !restaurant.name.toLowerCase().includes(filters.name.toLowerCase())) {
      return false
    }
    if (filters.cuisine_type && restaurant.cuisine_type !== filters.cuisine_type) {
      return false
    }
    if (filters.dining_style !== undefined && restaurant.dining_style !== filters.dining_style) {
      return false
    }
    if (filters.can_book === true && !canBook(restaurant.booking_hours)) {
      return false
    }
    if (filters.distance) {
      const distance = getDistanceValue(restaurant.x, restaurant.y)
      switch (filters.distance) {
        case '<200m':
          if (distance >= 200) return false
          break
        case '<500m':
          if (distance >= 500) return false
          break
        case '<1.0km':
          if (distance >= 1000) return false
          break
        case '<2.0km':
          if (distance >= 2000) return false
          break
        case 'other':
          if (distance < 2000) return false
          break
      }
    }
    return true
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollTop = container.scrollTop
      const scrollHeight = container.scrollHeight
      const clientHeight = container.clientHeight

      if (scrollHeight - scrollTop - clientHeight < 100 && !isLoading && displayCount < filteredRestaurants.length) {
        setIsLoading(true)
        setTimeout(() => {
          setDisplayCount((prev) => Math.min(prev + 5, filteredRestaurants.length))
          setIsLoading(false)
        }, 500)
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [isLoading, displayCount, filteredRestaurants.length])

  useEffect(() => {
    setDisplayCount(5)
  }, [filters])

  const displayedRestaurants = filteredRestaurants.slice(0, displayCount)
  const hasMore = displayCount < filteredRestaurants.length

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
                  已找到 {filteredRestaurants.length} 家餐厅
                </p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        resultCount={filteredRestaurants.length}
      />

      <div ref={containerRef} className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <div className="max-w-3xl mx-auto w-full px-4 py-4 space-y-4">
          {displayedRestaurants.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>

        {filteredRestaurants.length === 0 && (
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
      </div>
    </div>
  )
}
