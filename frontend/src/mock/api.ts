/**
 * Mock API 层 - 模拟后端接口响应
 *
 * 所有接口返回格式统一为：
 * { code: 0, data: { ... }, msg: "success" }
 *
 * 距离计算规则：
 * - 距离 = |x| + |y|（单位：米）
 * - >= 1000 米时转换为千米，如 1.7km
 */

const DiningStyle = {
  DINE_IN: 0,
  TAKEOUT: 1,
  BOTH: 2,
} as const

type DiningStyleType = typeof DiningStyle[keyof typeof DiningStyle]

export interface Restaurant {
  id: number
  name: string
  address: string
  x: number
  y: number
  cuisine_type: string | null
  dining_style: DiningStyleType
  tags: string[]
  business_hours: string | null
  booking_hours: string | null
  current_booking_count: number
  max_booking_count: number
  queue_time: number
  indoor_env: string | null
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
    address: '西城区西单北大街 130 号 B1 层',
    x: 150,
    y: 100,
    cuisine_type: '快餐',
    dining_style: DiningStyle.TAKEOUT,
    tags: ['24 小时', '快速'],
    business_hours: '24 小时',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    queue_time: 5,
    indoor_env: '简洁明亮',
  },
  {
    id: 5,
    name: '绿茶餐厅',
    address: '朝阳区朝阳北路 10 号大悦城 6 层',
    x: 600,
    y: 400,
    cuisine_type: '中餐',
    dining_style: DiningStyle.BOTH,
    tags: ['创意菜', '环境好'],
    business_hours: '10:00-22:00',
    booking_hours: '10:00-21:00',
    current_booking_count: 25,
    max_booking_count: 40,
    queue_time: -1,
    indoor_env: '文艺清新，有绿植装饰',
  },
  {
    id: 6,
    name: '九宫格火锅',
    address: '东城区东直门南小街 1 号',
    x: 350,
    y: 250,
    cuisine_type: '火锅',
    dining_style: DiningStyle.DINE_IN,
    tags: ['正宗重庆', '辣度可选'],
    business_hours: '11:00-23:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    queue_time: 30,
    indoor_env: '热闹，有包间',
  },
  {
    id: 7,
    name: '必胜客',
    address: '海淀区海淀路 1 号',
    x: 900,
    y: 700,
    cuisine_type: '西餐',
    dining_style: DiningStyle.BOTH,
    tags: ['披萨', '家庭聚餐'],
    business_hours: '10:00-22:00',
    booking_hours: '10:00-21:00',
    current_booking_count: 10,
    max_booking_count: 30,
    queue_time: -1,
    indoor_env: '舒适',
  },
  {
    id: 8,
    name: '烧烤大院',
    address: '朝阳区工体北路 4 号',
    x: 1200,
    y: 800,
    cuisine_type: '烧烤',
    dining_style: DiningStyle.DINE_IN,
    tags: ['炭火', '夜宵'],
    business_hours: '17:00-02:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    queue_time: 20,
    indoor_env: '露天 + 室内',
  },
  {
    id: 9,
    name: '星巴克',
    address: '西城区金融大街 1 号',
    x: 180,
    y: 120,
    cuisine_type: '其他',
    dining_style: DiningStyle.BOTH,
    tags: ['咖啡', '休闲'],
    business_hours: '07:00-22:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    queue_time: 3,
    indoor_env: '安静，适合办公',
  },
  {
    id: 10,
    name: '南京大牌档',
    address: '朝阳区建国门外大街 1 号',
    x: 550,
    y: 350,
    cuisine_type: '中餐',
    dining_style: DiningStyle.DINE_IN,
    tags: ['金陵特色', '评弹表演'],
    business_hours: '10:00-21:30',
    booking_hours: '10:00-20:30',
    current_booking_count: 18,
    max_booking_count: 60,
    queue_time: -1,
    indoor_env: '古色古香',
  },
  {
    id: 11,
    name: '呷哺呷哺',
    address: '海淀区中关村广场 1 号',
    x: 850,
    y: 650,
    cuisine_type: '火锅',
    dining_style: DiningStyle.DINE_IN,
    tags: ['一人食', '小火锅'],
    business_hours: '10:00-22:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    queue_time: 10,
    indoor_env: '简约',
  },
  {
    id: 12,
    name: '肯德基',
    address: '东城区崇文门外大街 1 号',
    x: 250,
    y: 200,
    cuisine_type: '快餐',
    dining_style: DiningStyle.TAKEOUT,
    tags: ['快速', '早餐'],
    business_hours: '06:00-23:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    queue_time: 5,
    indoor_env: '明亮',
  },
  {
    id: 13,
    name: '西堤牛排',
    address: '朝阳区三里屯路 19 号',
    x: 700,
    y: 500,
    cuisine_type: '西餐',
    dining_style: DiningStyle.BOTH,
    tags: ['浪漫', '约会'],
    business_hours: '11:00-22:00',
    booking_hours: '11:00-21:00',
    current_booking_count: 12,
    max_booking_count: 25,
    queue_time: -1,
    indoor_env: '浪漫温馨',
  },
  {
    id: 14,
    name: '小龙坎火锅',
    address: '西城区宣武门外大街 1 号',
    x: 300,
    y: 250,
    cuisine_type: '火锅',
    dining_style: DiningStyle.DINE_IN,
    tags: ['老字号', '正宗'],
    business_hours: '10:00-23:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    queue_time: 25,
    indoor_env: '传统中式',
  },
  {
    id: 15,
    name: '元气寿司',
    address: '朝阳区建国路 87 号',
    x: 480,
    y: 320,
    cuisine_type: '日料',
    dining_style: DiningStyle.BOTH,
    tags: ['回转寿司', '新鲜'],
    business_hours: '11:00-22:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    queue_time: 8,
    indoor_env: '日式',
  },
  {
    id: 16,
    name: '避风塘',
    address: '海淀区成府路 1 号',
    x: 950,
    y: 750,
    cuisine_type: '中餐',
    dining_style: DiningStyle.BOTH,
    tags: ['港式', '茶点'],
    business_hours: '08:00-22:00',
    booking_hours: '08:00-21:00',
    current_booking_count: 5,
    max_booking_count: 35,
    queue_time: -1,
    indoor_env: '港式风情',
  },
  {
    id: 17,
    name: '木屋烧烤',
    address: '东城区北三环东路 1 号',
    x: 400,
    y: 300,
    cuisine_type: '烧烤',
    dining_style: DiningStyle.DINE_IN,
    tags: ['连锁', '夜宵'],
    business_hours: '17:00-01:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    queue_time: 15,
    indoor_env: '休闲',
  },
  {
    id: 18,
    name: '真功夫',
    address: '西城区西长安街 1 号',
    x: 100,
    y: 80,
    cuisine_type: '快餐',
    dining_style: DiningStyle.TAKEOUT,
    tags: ['中式快餐', '健康'],
    business_hours: '07:00-22:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    queue_time: 3,
    indoor_env: '简洁',
  },
  {
    id: 19,
    name: '王品牛排',
    address: '朝阳区东三环中路 1 号',
    x: 650,
    y: 450,
    cuisine_type: '西餐',
    dining_style: DiningStyle.BOTH,
    tags: ['高档', '商务宴请'],
    business_hours: '11:30-22:00',
    booking_hours: '11:00-20:30',
    current_booking_count: 15,
    max_booking_count: 30,
    queue_time: -1,
    indoor_env: '豪华',
  },
  {
    id: 20,
    name: '鼎泰丰',
    address: '东城区东长安街 1 号',
    x: 220,
    y: 180,
    cuisine_type: '中餐',
    dining_style: DiningStyle.BOTH,
    tags: ['小笼包', '米其林'],
    business_hours: '10:00-21:30',
    booking_hours: '10:00-20:30',
    current_booking_count: 20,
    max_booking_count: 40,
    queue_time: -1,
    indoor_env: '精致典雅',
  },
]

interface GetRestaurantsParams {
  name?: string
  cuisine_type?: string
  dining_style?: number
  can_book?: boolean
  distance?: '<200m' | '<500m' | '<1.0km' | '<2.0km' | 'other'
  page?: number
  page_size?: number
}

interface GetRestaurantsResponse {
  code: number
  data: {
    list: Restaurant[]
    total: number
    page: number
    page_size: number
  }
  msg: string
}

/**
 * 计算距离（曼哈顿距离）
 */
function calculateDistance(x: number, y: number): number {
  return Math.abs(x) + Math.abs(y)
}

/**
 * 解析距离字符串为米数
 */
function parseDistance(distance: string): { min: number; max: number } {
  switch (distance) {
    case '<200m':
      return { min: 0, max: 200 }
    case '<500m':
      return { min: 0, max: 500 }
    case '<1.0km':
      return { min: 0, max: 1000 }
    case '<2.0km':
      return { min: 0, max: 2000 }
    case 'other':
      return { min: 2000, max: Infinity }
    default:
      return { min: 0, max: Infinity }
  }
}

/**
 * 获取餐厅列表
 * GET /api/restaurants
 */
export async function getRestaurants(params: GetRestaurantsParams): Promise<GetRestaurantsResponse> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 200))

  let filtered = [...MOCK_RESTAURANTS]

  // 名字搜索
  if (params.name) {
    filtered = filtered.filter(r => r.name.includes(params.name!))
  }

  // 菜系筛选
  if (params.cuisine_type) {
    filtered = filtered.filter(r => r.cuisine_type === params.cuisine_type)
  }

  // 用餐方式筛选
  if (params.dining_style !== undefined) {
    filtered = filtered.filter(r => r.dining_style === params.dining_style)
  }

  // 是否可预约筛选
  if (params.can_book !== undefined) {
    filtered = filtered.filter(r => {
      const canBook = r.booking_hours !== '不能预约'
      return canBook === params.can_book
    })
  }

  // 距离筛选
  if (params.distance) {
    const { min, max } = parseDistance(params.distance)
    filtered = filtered.filter(r => {
      const distance = calculateDistance(r.x, r.y)
      return distance >= min && distance <= max
    })
  }

  const total = filtered.length

  // 分页
  const page = params.page || 1
  const page_size = params.page_size || 5
  const start = (page - 1) * page_size
  const end = start + page_size
  const list = filtered.slice(start, end)

  return {
    code: 0,
    data: {
      list,
      total,
      page,
      page_size,
    },
    msg: 'success',
  }
}

// ==================== 户外景点 / Scenic Spots ====================

export interface Park {
  id: number
  name: string
  address: string
  x: number
  y: number
  spot_type: string | null // 山水/古迹/人文/溶洞等
  business_hours: string | null
  booking_hours: string | null
  current_booking_count: number
  max_booking_count: number
  crowd_density: number // 1 稀少 2 适中 3 拥挤
}

interface GetParksParams {
  name?: string
  spot_type?: string
  crowd_density?: number
  can_book?: boolean
  distance?: '<200m' | '<500m' | '<1.0km' | '<2.0km' | 'other'
  page?: number
  page_size?: number
}

interface GetParksResponse {
  code: number
  data: {
    list: Park[]
    total: number
    page: number
    page_size: number
  }
  msg: string
}

const MOCK_PARKS: Park[] = [
  {
    id: 1,
    name: '颐和园',
    address: '海淀区新建宫门路 19 号',
    x: 2000,
    y: 1500,
    spot_type: '古迹',
    business_hours: '06:30-18:00',
    booking_hours: '06:00-17:00',
    current_booking_count: 120,
    max_booking_count: 500,
    crowd_density: 3,
  },
  {
    id: 2,
    name: '八达岭长城',
    address: '延庆区G6京藏高速 58 号',
    x: 8000,
    y: 6000,
    spot_type: '古迹',
    business_hours: '07:30-16:00',
    booking_hours: '07:00-15:00',
    current_booking_count: 300,
    max_booking_count: 1000,
    crowd_density: 3,
  },
  {
    id: 3,
    name: '故宫博物院',
    address: '东城区景山前街 4 号',
    x: 300,
    y: 250,
    spot_type: '古迹',
    business_hours: '08:30-17:00',
    booking_hours: '08:00-16:00',
    current_booking_count: 200,
    max_booking_count: 800,
    crowd_density: 3,
  },
  {
    id: 4,
    name: '奥林匹克森林公园',
    address: '朝阳区北辰东路 15 号',
    x: 1200,
    y: 1000,
    spot_type: '山水',
    business_hours: '06:00-21:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    crowd_density: 1,
  },
  {
    id: 5,
    name: '香山公园',
    address: '海淀区香山买卖街 40 号',
    x: 3000,
    y: 2200,
    spot_type: '山水',
    business_hours: '06:00-18:30',
    booking_hours: '06:00-17:00',
    current_booking_count: 50,
    max_booking_count: 300,
    crowd_density: 2,
  },
  {
    id: 6,
    name: '北海公园',
    address: '西城区文津街 1 号',
    x: 500,
    y: 400,
    spot_type: '古迹',
    business_hours: '06:30-20:00',
    booking_hours: '06:00-19:00',
    current_booking_count: 80,
    max_booking_count: 400,
    crowd_density: 3,
  },
  {
    id: 7,
    name: '天坛公园',
    address: '东城区天坛内东里 7 号',
    x: 600,
    y: 500,
    spot_type: '古迹',
    business_hours: '06:00-21:00',
    booking_hours: '06:00-20:00',
    current_booking_count: 90,
    max_booking_count: 600,
    crowd_density: 2,
  },
  {
    id: 8,
    name: '十渡风景区',
    address: '房山区十渡镇',
    x: 6000,
    y: 5000,
    spot_type: '山水',
    business_hours: '08:00-17:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    crowd_density: 1,
  },
  {
    id: 9,
    name: '石花洞',
    address: '房山区河北镇南车营村',
    x: 5500,
    y: 4500,
    spot_type: '溶洞',
    business_hours: '08:30-17:00',
    booking_hours: '08:00-16:00',
    current_booking_count: 30,
    max_booking_count: 200,
    crowd_density: 1,
  },
  {
    id: 10,
    name: '红螺寺',
    address: '怀柔区红螺东路 2 号',
    x: 5000,
    y: 4000,
    spot_type: '人文',
    business_hours: '08:00-17:00',
    booking_hours: '08:00-16:00',
    current_booking_count: 40,
    max_booking_count: 300,
    crowd_density: 2,
  },
  {
    id: 11,
    name: '古北水镇',
    address: '密云区古北口镇司马台村',
    x: 10000,
    y: 8000,
    spot_type: '人文',
    business_hours: '09:00-22:00',
    booking_hours: '09:00-21:00',
    current_booking_count: 150,
    max_booking_count: 600,
    crowd_density: 2,
  },
  {
    id: 12,
    name: '慕田峪长城',
    address: '怀柔区渤海镇慕田峪村',
    x: 7000,
    y: 5500,
    spot_type: '古迹',
    business_hours: '07:30-17:30',
    booking_hours: '07:00-16:30',
    current_booking_count: 80,
    max_booking_count: 500,
    crowd_density: 2,
  },
  {
    id: 13,
    name: '玉渊潭公园',
    address: '海淀区西三环中路 10 号',
    x: 1000,
    y: 800,
    spot_type: '山水',
    business_hours: '06:00-21:30',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    crowd_density: 2,
  },
  {
    id: 14,
    name: '北京动物园',
    address: '西城区西直门外大街 137 号',
    x: 950,
    y: 750,
    spot_type: '人文',
    business_hours: '07:30-18:00',
    booking_hours: '07:00-17:00',
    current_booking_count: 60,
    max_booking_count: 400,
    crowd_density: 3,
  },
  {
    id: 15,
    name: '龙庆峡',
    address: '延庆区古城村',
    x: 9000,
    y: 7000,
    spot_type: '山水',
    business_hours: '08:00-17:00',
    booking_hours: '08:00-16:00',
    current_booking_count: 25,
    max_booking_count: 200,
    crowd_density: 1,
  },
  {
    id: 16,
    name: '潭柘寺',
    address: '门头沟区潭柘寺镇',
    x: 4000,
    y: 3200,
    spot_type: '人文',
    business_hours: '08:30-16:30',
    booking_hours: '08:00-16:00',
    current_booking_count: 35,
    max_booking_count: 250,
    crowd_density: 2,
  },
  {
    id: 17,
    name: '国家植物园',
    address: '海淀区香山南路',
    x: 2500,
    y: 1800,
    spot_type: '山水',
    business_hours: '06:00-20:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    crowd_density: 2,
  },
  {
    id: 18,
    name: '银狐洞',
    address: '房山区佛子庄乡下英水村',
    x: 5800,
    y: 4800,
    spot_type: '溶洞',
    business_hours: '08:30-16:30',
    booking_hours: '08:00-16:00',
    current_booking_count: 15,
    max_booking_count: 150,
    crowd_density: 1,
  },
  {
    id: 19,
    name: '中山公园',
    address: '东城区中华路 4 号',
    x: 400,
    y: 350,
    spot_type: '古迹',
    business_hours: '06:30-20:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    crowd_density: 2,
  },
  {
    id: 20,
    name: '京东大溶洞',
    address: '平谷区黑豆峪村东侧',
    x: 7000,
    y: 5500,
    spot_type: '溶洞',
    business_hours: '08:00-17:00',
    booking_hours: '08:00-16:00',
    current_booking_count: 20,
    max_booking_count: 180,
    crowd_density: 1,
  },
]

// ==================== 商场 / Malls ====================

export interface Mall {
  id: number
  name: string
  address: string
  x: number
  y: number
  cinema_has: number  // 0 无 1 有
  supermarket_has: number  // 0 无 1 有
  discount_status: number  // 0 无优惠 1 有优惠
}

interface GetMallsParams {
  name?: string
  cinema_has?: number
  supermarket_has?: number
  discount_status?: number
  distance?: '<200m' | '<500m' | '<1.0km' | '<2.0km' | 'other'
  page?: number
  page_size?: number
}

interface GetMallsResponse {
  code: number
  data: {
    list: Mall[]
    total: number
    page: number
    page_size: number
  }
  msg: string
}

const MOCK_MALLS: Mall[] = [
  {
    id: 1,
    name: '朝阳大悦城',
    address: '朝阳区朝阳北路 101 号',
    x: 600,
    y: 450,
    cinema_has: 1,
    supermarket_has: 1,
    discount_status: 1,
  },
  {
    id: 2,
    name: '西单大悦城',
    address: '西城区西单北大街 131 号',
    x: 180,
    y: 150,
    cinema_has: 1,
    supermarket_has: 0,
    discount_status: 1,
  },
  {
    id: 3,
    name: '国贸商城',
    address: '朝阳区建国门外大街 1 号',
    x: 400,
    y: 300,
    cinema_has: 1,
    supermarket_has: 0,
    discount_status: 0,
  },
  {
    id: 4,
    name: '三里屯太古里',
    address: '朝阳区三里屯路 19 号',
    x: 500,
    y: 380,
    cinema_has: 1,
    supermarket_has: 1,
    discount_status: 1,
  },
  {
    id: 5,
    name: '合生汇',
    address: '朝阳区西大望路 21 号',
    x: 550,
    y: 420,
    cinema_has: 1,
    supermarket_has: 1,
    discount_status: 1,
  },
  {
    id: 6,
    name: '蓝色港湾',
    address: '朝阳区朝阳公园路 6 号',
    x: 700,
    y: 520,
    cinema_has: 1,
    supermarket_has: 0,
    discount_status: 0,
  },
  {
    id: 7,
    name: '华熙 LIVE·五棵松',
    address: '海淀区复兴路 69 号',
    x: 1500,
    y: 1100,
    cinema_has: 1,
    supermarket_has: 1,
    discount_status: 1,
  },
  {
    id: 8,
    name: '荟聚购物中心',
    address: '大兴区欣宁街 15 号',
    x: 2800,
    y: 2200,
    cinema_has: 1,
    supermarket_has: 1,
    discount_status: 1,
  },
  {
    id: 9,
    name: '龙湖长楹天街',
    address: '朝阳区朝阳北路 35 号',
    x: 2000,
    y: 1500,
    cinema_has: 1,
    supermarket_has: 1,
    discount_status: 0,
  },
  {
    id: 10,
    name: '世纪金源购物中心',
    address: '海淀区远大路 1 号',
    x: 1600,
    y: 1200,
    cinema_has: 1,
    supermarket_has: 1,
    discount_status: 1,
  },
  {
    id: 11,
    name: '东方新天地',
    address: '东城区东长安街 1 号',
    x: 300,
    y: 200,
    cinema_has: 0,
    supermarket_has: 0,
    discount_status: 0,
  },
  {
    id: 12,
    name: '王府中环',
    address: '东城区王府井大街 269 号',
    x: 250,
    y: 180,
    cinema_has: 1,
    supermarket_has: 0,
    discount_status: 0,
  },
  {
    id: 13,
    name: 'APM 王府井',
    address: '东城区王府井大街 138 号',
    x: 280,
    y: 190,
    cinema_has: 1,
    supermarket_has: 0,
    discount_status: 1,
  },
  {
    id: 14,
    name: '银座 mall',
    address: '东城区东二环东中街 1 号',
    x: 350,
    y: 260,
    cinema_has: 0,
    supermarket_has: 1,
    discount_status: 0,
  },
  {
    id: 15,
    name: '新中关购物中心',
    address: '海淀区中关村大街 19 号',
    x: 1000,
    y: 750,
    cinema_has: 1,
    supermarket_has: 0,
    discount_status: 1,
  },
  {
    id: 16,
    name: '爱琴海购物公园',
    address: '朝阳区七圣中街 12 号',
    x: 800,
    y: 600,
    cinema_has: 1,
    supermarket_has: 1,
    discount_status: 1,
  },
  {
    id: 17,
    name: '凯德 mall',
    address: '西城区西直门外大街 1 号',
    x: 900,
    y: 680,
    cinema_has: 1,
    supermarket_has: 0,
    discount_status: 0,
  },
  {
    id: 18,
    name: '万达广场（通州）',
    address: '通州区新华西街 58 号',
    x: 3500,
    y: 2800,
    cinema_has: 1,
    supermarket_has: 1,
    discount_status: 1,
  },
  {
    id: 19,
    name: '京通罗斯福广场',
    address: '通州区梨园镇九棵树中路 48 号',
    x: 4000,
    y: 3200,
    cinema_has: 1,
    supermarket_has: 1,
    discount_status: 0,
  },
  {
    id: 20,
    name: '昌平悦荟广场',
    address: '昌平区南环路 10 号',
    x: 5000,
    y: 4000,
    cinema_has: 1,
    supermarket_has: 1,
    discount_status: 0,
  },
]

/**
 * 获取商场列表
 * GET /api/malls
 */
export async function getMalls(params: GetMallsParams): Promise<GetMallsResponse> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 200))

  let filtered = [...MOCK_MALLS]

  // 名字搜索
  if (params.name) {
    filtered = filtered.filter(r => r.name.includes(params.name!))
  }

  // 影院筛选
  if (params.cinema_has !== undefined) {
    filtered = filtered.filter(r => r.cinema_has === params.cinema_has)
  }

  // 大型超市筛选
  if (params.supermarket_has !== undefined) {
    filtered = filtered.filter(r => r.supermarket_has === params.supermarket_has)
  }

  // 优惠活动筛选
  if (params.discount_status !== undefined) {
    filtered = filtered.filter(r => r.discount_status === params.discount_status)
  }

  // 距离筛选
  if (params.distance) {
    const { min, max } = parseDistance(params.distance)
    filtered = filtered.filter(r => {
      const distance = calculateDistance(r.x, r.y)
      return distance >= min && distance <= max
    })
  }

  const total = filtered.length

  // 分页
  const page = params.page || 1
  const page_size = params.page_size || 5
  const start = (page - 1) * page_size
  const end = start + page_size
  const list = filtered.slice(start, end)

  return {
    code: 0,
    data: {
      list,
      total,
      page,
      page_size,
    },
    msg: 'success',
  }
}

/**
 * 获取公园列表
 * GET /api/parks
 */
// ==================== 展馆展览馆 / Exhibition Halls ====================

interface ExhibitionHall {
  id: number
  name: string
  address: string
  x: number
  y: number
  hall_type: string | null // 历史/艺术/科技/自然
  business_hours: string | null
  booking_hours: string | null
  current_booking_count: number
  max_booking_count: number
  exhibition_theme: string | null // 主打展览主题
  ticket_type: number // 0 免费 1 收费
  ticket_price: number | null
  manual_guide: number // 0 无 1 有
  interactive_project: number // 0 无 1 有
  crowd_level: number // 1 偏少 2 适中 3 拥挤
}

interface GetExhibitionsParams {
  name?: string
  hall_type?: string
  ticket_type?: number
  crowd_level?: number
  can_book?: boolean
  manual_guide?: number
  interactive_project?: number
  distance?: '<200m' | '<500m' | '<1.0km' | '<2.0km' | 'other'
  page?: number
  page_size?: number
}

interface GetExhibitionsResponse {
  code: number
  data: {
    list: ExhibitionHall[]
    total: number
    page: number
    page_size: number
  }
  msg: string
}

const MOCK_EXHIBITIONS: ExhibitionHall[] = [
  {
    id: 1,
    name: '中国国家博物馆',
    address: '东城区东长安街 16 号',
    x: 320,
    y: 240,
    hall_type: '历史',
    business_hours: '09:00-17:00',
    booking_hours: '09:00-16:00',
    current_booking_count: 200,
    max_booking_count: 800,
    exhibition_theme: '古代中国基本陈列',
    ticket_type: 0,
    ticket_price: null,
    manual_guide: 1,
    interactive_project: 0,
    crowd_level: 3,
  },
  {
    id: 2,
    name: '故宫博物院',
    address: '东城区景山前街 4 号',
    x: 300,
    y: 250,
    hall_type: '历史',
    business_hours: '08:30-17:00',
    booking_hours: '08:00-16:00',
    current_booking_count: 300,
    max_booking_count: 800,
    exhibition_theme: '宫廷文物珍宝展',
    ticket_type: 1,
    ticket_price: 60,
    manual_guide: 1,
    interactive_project: 0,
    crowd_level: 3,
  },
  {
    id: 3,
    name: '中国科学技术馆',
    address: '朝阳区北辰东路 5 号',
    x: 1100,
    y: 900,
    hall_type: '科技',
    business_hours: '09:30-17:00',
    booking_hours: '09:00-16:00',
    current_booking_count: 150,
    max_booking_count: 600,
    exhibition_theme: '科学乐园·华夏之光',
    ticket_type: 1,
    ticket_price: 30,
    manual_guide: 0,
    interactive_project: 1,
    crowd_level: 3,
  },
  {
    id: 4,
    name: '国家自然博物馆',
    address: '东城区天桥南大街 126 号',
    x: 450,
    y: 350,
    hall_type: '自然',
    business_hours: '09:00-17:00',
    booking_hours: '09:00-16:00',
    current_booking_count: 80,
    max_booking_count: 400,
    exhibition_theme: '恐龙化石展·植物世界',
    ticket_type: 0,
    ticket_price: null,
    manual_guide: 1,
    interactive_project: 0,
    crowd_level: 2,
  },
  {
    id: 5,
    name: '今日美术馆',
    address: '朝阳区百子湾路 32 号',
    x: 650,
    y: 480,
    hall_type: '艺术',
    business_hours: '10:00-18:00',
    booking_hours: '10:00-17:00',
    current_booking_count: 30,
    max_booking_count: 200,
    exhibition_theme: '当代艺术系列展',
    ticket_type: 1,
    ticket_price: 40,
    manual_guide: 0,
    interactive_project: 0,
    crowd_level: 1,
  },
  {
    id: 6,
    name: '首都博物馆',
    address: '西城区复兴门外大街 16 号',
    x: 350,
    y: 280,
    hall_type: '历史',
    business_hours: '09:00-17:00',
    booking_hours: '09:00-16:00',
    current_booking_count: 60,
    max_booking_count: 500,
    exhibition_theme: '北京历史文化展',
    ticket_type: 0,
    ticket_price: null,
    manual_guide: 1,
    interactive_project: 0,
    crowd_level: 2,
  },
  {
    id: 7,
    name: '清华大学艺术博物馆',
    address: '海淀区双清路 30 号',
    x: 900,
    y: 700,
    hall_type: '艺术',
    business_hours: '09:00-17:00',
    booking_hours: '09:00-16:00',
    current_booking_count: 45,
    max_booking_count: 300,
    exhibition_theme: '书画艺术·陶瓷精品展',
    ticket_type: 1,
    ticket_price: 20,
    manual_guide: 1,
    interactive_project: 0,
    crowd_level: 2,
  },
  {
    id: 8,
    name: '北京天文馆',
    address: '西城区西直门外大街 138 号',
    x: 920,
    y: 720,
    hall_type: '科技',
    business_hours: '09:00-16:30',
    booking_hours: '09:00-15:30',
    current_booking_count: 70,
    max_booking_count: 300,
    exhibition_theme: '宇宙探索·天文观测',
    ticket_type: 1,
    ticket_price: 15,
    manual_guide: 0,
    interactive_project: 1,
    crowd_level: 2,
  },
  {
    id: 9,
    name: '中国美术馆',
    address: '东城区五四大街 1 号',
    x: 280,
    y: 220,
    hall_type: '艺术',
    business_hours: '09:00-17:00',
    booking_hours: '09:00-16:00',
    current_booking_count: 40,
    max_booking_count: 350,
    exhibition_theme: '近现代美术大师作品展',
    ticket_type: 0,
    ticket_price: null,
    manual_guide: 1,
    interactive_project: 0,
    crowd_level: 2,
  },
  {
    id: 10,
    name: '中国航空博物馆',
    address: '昌平区小汤山镇顺沙路',
    x: 4500,
    y: 3500,
    hall_type: '科技',
    business_hours: '08:30-17:00',
    booking_hours: '08:00-16:00',
    current_booking_count: 35,
    max_booking_count: 300,
    exhibition_theme: '中国航空发展史',
    ticket_type: 0,
    ticket_price: null,
    manual_guide: 1,
    interactive_project: 1,
    crowd_level: 1,
  },
  {
    id: 11,
    name: '北京汽车博物馆',
    address: '丰台区南四环西路 126 号',
    x: 2500,
    y: 2000,
    hall_type: '科技',
    business_hours: '09:00-17:00',
    booking_hours: '09:00-16:00',
    current_booking_count: 25,
    max_booking_count: 200,
    exhibition_theme: '汽车百年历史·未来汽车',
    ticket_type: 1,
    ticket_price: 25,
    manual_guide: 0,
    interactive_project: 1,
    crowd_level: 1,
  },
  {
    id: 12,
    name: '中华世纪坛艺术馆',
    address: '海淀区复兴路甲 9 号',
    x: 1200,
    y: 950,
    hall_type: '艺术',
    business_hours: '09:00-17:00',
    booking_hours: '09:00-16:00',
    current_booking_count: 20,
    max_booking_count: 200,
    exhibition_theme: '世界艺术巡礼·数字艺术展',
    ticket_type: 1,
    ticket_price: 30,
    manual_guide: 0,
    interactive_project: 1,
    crowd_level: 1,
  },
  {
    id: 13,
    name: '北京古观象台',
    address: '东城区东裱褙胡同 2 号',
    x: 340,
    y: 260,
    hall_type: '历史',
    business_hours: '09:00-17:00',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    exhibition_theme: '古代天文仪器陈列',
    ticket_type: 1,
    ticket_price: 10,
    manual_guide: 1,
    interactive_project: 0,
    crowd_level: 1,
  },
  {
    id: 14,
    name: '中国电影博物馆',
    address: '朝阳区南影路 9 号',
    x: 1800,
    y: 1400,
    hall_type: '艺术',
    business_hours: '09:00-16:30',
    booking_hours: '09:00-15:30',
    current_booking_count: 30,
    max_booking_count: 250,
    exhibition_theme: '中国电影百年历程',
    ticket_type: 0,
    ticket_price: null,
    manual_guide: 0,
    interactive_project: 1,
    crowd_level: 1,
  },
  {
    id: 15,
    name: '中国地质博物馆',
    address: '西城区西四羊肉胡同 15 号',
    x: 250,
    y: 200,
    hall_type: '自然',
    business_hours: '09:00-16:30',
    booking_hours: '09:00-15:30',
    current_booking_count: 15,
    max_booking_count: 150,
    exhibition_theme: '地球瑰宝·矿物晶体展',
    ticket_type: 0,
    ticket_price: null,
    manual_guide: 1,
    interactive_project: 0,
    crowd_level: 1,
  },
  {
    id: 16,
    name: '北京自然博物馆',
    address: '东城区天桥南大街 126 号',
    x: 460,
    y: 360,
    hall_type: '自然',
    business_hours: '09:00-17:00',
    booking_hours: '09:00-16:00',
    current_booking_count: 55,
    max_booking_count: 350,
    exhibition_theme: '生命的演化·动物世界',
    ticket_type: 0,
    ticket_price: null,
    manual_guide: 1,
    interactive_project: 0,
    crowd_level: 2,
  },
  {
    id: 17,
    name: '798 艺术区展览中心',
    address: '朝阳区酒仙桥路 4 号',
    x: 1600,
    y: 1200,
    hall_type: '艺术',
    business_hours: '10:00-19:00',
    booking_hours: '10:00-18:00',
    current_booking_count: 20,
    max_booking_count: 150,
    exhibition_theme: '当代艺术·潮流展览',
    ticket_type: 1,
    ticket_price: 35,
    manual_guide: 0,
    interactive_project: 1,
    crowd_level: 2,
  },
  {
    id: 18,
    name: '中国人民革命军事博物馆',
    address: '海淀区复兴路 9 号',
    x: 1100,
    y: 850,
    hall_type: '历史',
    business_hours: '09:00-17:00',
    booking_hours: '09:00-16:00',
    current_booking_count: 90,
    max_booking_count: 500,
    exhibition_theme: '兵器陈列·军事历史',
    ticket_type: 0,
    ticket_price: null,
    manual_guide: 1,
    interactive_project: 0,
    crowd_level: 2,
  },
  {
    id: 19,
    name: '北京海洋馆',
    address: '海淀区高梁桥斜街乙 18 号',
    x: 950,
    y: 750,
    hall_type: '自然',
    business_hours: '09:00-17:30',
    booking_hours: '09:00-16:30',
    current_booking_count: 100,
    max_booking_count: 400,
    exhibition_theme: '海洋生物展示·海豚表演',
    ticket_type: 1,
    ticket_price: 80,
    manual_guide: 0,
    interactive_project: 1,
    crowd_level: 3,
  },
  {
    id: 20,
    name: '宋庆龄故居展览馆',
    address: '西城区后海北沿 46 号',
    x: 200,
    y: 160,
    hall_type: '历史',
    business_hours: '09:00-16:30',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    exhibition_theme: '宋庆龄生平展',
    ticket_type: 0,
    ticket_price: null,
    manual_guide: 1,
    interactive_project: 0,
    crowd_level: 1,
  },
]

/**
 * 获取展览馆列表
 * GET /api/exhibitions
 */
export async function getExhibitions(params: GetExhibitionsParams): Promise<GetExhibitionsResponse> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 200))

  let filtered = [...MOCK_EXHIBITIONS]

  // 名字搜索
  if (params.name) {
    filtered = filtered.filter(r => r.name.includes(params.name!))
  }

  // 展馆类型筛选
  if (params.hall_type) {
    filtered = filtered.filter(r => r.hall_type === params.hall_type)
  }

  // 门票类型筛选
  if (params.ticket_type !== undefined) {
    filtered = filtered.filter(r => r.ticket_type === params.ticket_type)
  }

  // 人流量筛选
  if (params.crowd_level !== undefined) {
    filtered = filtered.filter(r => r.crowd_level === params.crowd_level)
  }

  // 是否可预约
  if (params.can_book !== undefined) {
    filtered = filtered.filter(r => {
      const canBook = r.booking_hours !== '不能预约'
      return canBook === params.can_book
    })
  }

  // 人工讲解
  if (params.manual_guide !== undefined) {
    filtered = filtered.filter(r => r.manual_guide === params.manual_guide)
  }

  // 互动体验
  if (params.interactive_project !== undefined) {
    filtered = filtered.filter(r => r.interactive_project === params.interactive_project)
  }

  // 距离筛选
  if (params.distance) {
    const { min, max } = parseDistance(params.distance)
    filtered = filtered.filter(r => {
      const distance = calculateDistance(r.x, r.y)
      return distance >= min && distance <= max
    })
  }

  const total = filtered.length

  // 分页
  const page = params.page || 1
  const page_size = params.page_size || 5
  const start = (page - 1) * page_size
  const end = start + page_size
  const list = filtered.slice(start, end)

  return {
    code: 0,
    data: {
      list,
      total,
      page,
      page_size,
    },
    msg: 'success',
  }
}

export { type ExhibitionHall, type GetExhibitionsParams, type GetExhibitionsResponse }

// ==================== 游乐园/主题乐园 / Amusement Parks ====================

interface AmusementPark {
  id: number
  name: string
  address: string
  x: number
  y: number
  business_hours: string | null
  booking_hours: string | null
  current_booking_count: number
  max_booking_count: number
  park_theme: string | null // 童话/海洋/科幻/卡通等
  ticket_price: number
  queue_time: number // -1 无需排队
  performance_info: string | null
}

interface GetAmusementParksParams {
  name?: string
  park_theme?: string
  can_book?: boolean
  distance?: '<200m' | '<500m' | '<1.0km' | '<2.0km' | 'other'
  page?: number
  page_size?: number
}

interface GetAmusementParksResponse {
  code: number
  data: {
    list: AmusementPark[]
    total: number
    page: number
    page_size: number
  }
  msg: string
}

const MOCK_AMUSEMENT_PARKS: AmusementPark[] = [
  {
    id: 1,
    name: '北京欢乐谷',
    address: '朝阳区东四环小武基北路',
    x: 1500,
    y: 1100,
    business_hours: '09:00-22:00',
    booking_hours: '08:30-21:00',
    current_booking_count: 200,
    max_booking_count: 800,
    park_theme: '科幻',
    ticket_price: 299,
    queue_time: 30,
    performance_info: '《金面王朝》大型演出 14:00/16:00',
  },
  {
    id: 2,
    name: '环球影城',
    address: '通州区梨园镇东六环',
    x: 5000,
    y: 3800,
    business_hours: '09:00-21:00',
    booking_hours: '08:00-20:00',
    current_booking_count: 500,
    max_booking_count: 1500,
    park_theme: '科幻',
    ticket_price: 528,
    queue_time: 45,
    performance_info: '霍格沃茨灯光秀 19:30/20:30',
  },
  {
    id: 3,
    name: '北京动物园海洋馆',
    address: '海淀区高梁桥斜街乙 18 号',
    x: 950,
    y: 750,
    business_hours: '09:00-17:30',
    booking_hours: '09:00-16:30',
    current_booking_count: 100,
    max_booking_count: 400,
    park_theme: '海洋',
    ticket_price: 80,
    queue_time: 15,
    performance_info: '海豚表演 10:30/14:00/16:00',
  },
  {
    id: 4,
    name: '石景山游乐园',
    address: '石景山区石景山路 25 号',
    x: 2200,
    y: 1700,
    business_hours: '09:00-17:30',
    booking_hours: '09:00-16:30',
    current_booking_count: 60,
    max_booking_count: 400,
    park_theme: '童话',
    ticket_price: 99,
    queue_time: 10,
    performance_info: '花车巡游 15:00',
  },
  {
    id: 5,
    name: '北京水上乐园',
    address: '朝阳区来广营北路 88 号',
    x: 1800,
    y: 1400,
    business_hours: '10:00-20:00',
    booking_hours: '10:00-19:00',
    current_booking_count: 80,
    max_booking_count: 500,
    park_theme: '海洋',
    ticket_price: 168,
    queue_time: 20,
    performance_info: '造浪池 DJ 表演 15:00/17:00',
  },
  {
    id: 6,
    name: '世界公园',
    address: '丰台区丰台路 158 号',
    x: 2500,
    y: 1900,
    business_hours: '08:30-17:30',
    booking_hours: '08:00-16:30',
    current_booking_count: 40,
    max_booking_count: 300,
    park_theme: '卡通',
    ticket_price: 100,
    queue_time: -1,
    performance_info: '世界风情表演 14:30',
  },
  {
    id: 7,
    name: '乐多港·卡乐星球',
    address: '昌平区城南街道邓庄村西',
    x: 4000,
    y: 3200,
    business_hours: '09:00-18:00',
    booking_hours: '09:00-17:00',
    current_booking_count: 30,
    max_booking_count: 300,
    park_theme: '科幻',
    ticket_price: 220,
    queue_time: 10,
    performance_info: '4D 影院整点播放',
  },
  {
    id: 8,
    name: '呀路古热带植物园',
    address: '大兴区长子营镇',
    x: 3500,
    y: 2800,
    business_hours: '08:30-17:30',
    booking_hours: '08:00-17:00',
    current_booking_count: 20,
    max_booking_count: 200,
    park_theme: '童话',
    ticket_price: 60,
    queue_time: -1,
    performance_info: '少数民族歌舞表演 11:00/14:30',
  },
  {
    id: 9,
    name: '北京海洋馆',
    address: '海淀区高梁桥斜街乙 18 号',
    x: 960,
    y: 760,
    business_hours: '09:00-17:30',
    booking_hours: '09:00-16:30',
    current_booking_count: 90,
    max_booking_count: 400,
    park_theme: '海洋',
    ticket_price: 80,
    queue_time: 15,
    performance_info: '海狮表演 11:00/13:30/15:30',
  },
  {
    id: 10,
    name: '疯狂运动乐园',
    address: '朝阳区亮马桥路 27 号',
    x: 700,
    y: 550,
    business_hours: '10:00-22:00',
    booking_hours: '10:00-21:00',
    current_booking_count: 25,
    max_booking_count: 150,
    park_theme: '卡通',
    ticket_price: 128,
    queue_time: 5,
    performance_info: null,
  },
  {
    id: 11,
    name: '南宫温泉水世界',
    address: '丰台区王佐镇南宫路',
    x: 3000,
    y: 2400,
    business_hours: '09:00-22:00',
    booking_hours: '09:00-21:00',
    current_booking_count: 50,
    max_booking_count: 300,
    park_theme: '海洋',
    ticket_price: 198,
    queue_time: 5,
    performance_info: null,
  },
  {
    id: 12,
    name: '北京恐龙乐园',
    address: '昌平区十三陵镇',
    x: 4200,
    y: 3400,
    business_hours: '09:00-17:30',
    booking_hours: '09:00-16:30',
    current_booking_count: 35,
    max_booking_count: 250,
    park_theme: '童话',
    ticket_price: 88,
    queue_time: 8,
    performance_info: '恐龙互动表演 10:30/14:30',
  },
  {
    id: 13,
    name: '北京巧克力乐园',
    address: '朝阳区东坝乡',
    x: 2000,
    y: 1600,
    business_hours: '09:30-18:00',
    booking_hours: '09:00-17:00',
    current_booking_count: 15,
    max_booking_count: 150,
    park_theme: '童话',
    ticket_price: 58,
    queue_time: 5,
    performance_info: '巧克力 DIY 体验',
  },
  {
    id: 14,
    name: '幻境乐园',
    address: '朝阳区三里屯路 19 号院',
    x: 520,
    y: 400,
    business_hours: '10:00-22:00',
    booking_hours: '10:00-21:00',
    current_booking_count: 10,
    max_booking_count: 100,
    park_theme: '科幻',
    ticket_price: 158,
    queue_time: -1,
    performance_info: 'VR 沉浸体验',
  },
  {
    id: 15,
    name: '北京稻香湖公园',
    address: '海淀区苏家坨镇稻香湖路',
    x: 3200,
    y: 2500,
    business_hours: '08:30-17:30',
    booking_hours: '不能预约',
    current_booking_count: -1,
    max_booking_count: -1,
    park_theme: '童话',
    ticket_price: 0,
    queue_time: -1,
    performance_info: null,
  },
  {
    id: 16,
    name: '国色天香乐园',
    address: '大兴区魏善庄镇',
    x: 3800,
    y: 3000,
    business_hours: '09:00-18:00',
    booking_hours: '09:00-17:00',
    current_booking_count: 20,
    max_booking_count: 200,
    park_theme: '卡通',
    ticket_price: 45,
    queue_time: -1,
    performance_info: '花海观赏季',
  },
  {
    id: 17,
    name: '大运河文化旅游景区',
    address: '通州区运河公园内',
    x: 4800,
    y: 3600,
    business_hours: '08:30-20:00',
    booking_hours: '08:00-19:00',
    current_booking_count: 45,
    max_booking_count: 300,
    park_theme: '童话',
    ticket_price: 0,
    queue_time: -1,
    performance_info: '灯光水舞秀 19:30',
  },
  {
    id: 18,
    name: '泡泡跑主题乐园',
    address: '朝阳区常营乡',
    x: 1700,
    y: 1300,
    business_hours: '09:30-18:00',
    booking_hours: '09:00-17:00',
    current_booking_count: 15,
    max_booking_count: 150,
    park_theme: '卡通',
    ticket_price: 68,
    queue_time: 8,
    performance_info: '泡泡派对 14:00/16:00',
  },
  {
    id: 19,
    name: '冰雪大世界',
    address: '昌平区小汤山镇',
    x: 4500,
    y: 3600,
    business_hours: '09:00-21:00',
    booking_hours: '09:00-20:00',
    current_booking_count: 30,
    max_booking_count: 200,
    park_theme: '童话',
    ticket_price: 128,
    queue_time: 10,
    performance_info: '冰雕展·雪上项目',
  },
  {
    id: 20,
    name: '北京野生动物园',
    address: '大兴区榆垡镇万亩森林',
    x: 5500,
    y: 4200,
    business_hours: '08:30-17:30',
    booking_hours: '08:00-16:30',
    current_booking_count: 120,
    max_booking_count: 500,
    park_theme: '童话',
    ticket_price: 150,
    queue_time: 20,
    performance_info: '动物表演 11:00/14:00',
  },
]

/**
 * 获取游乐园列表
 * GET /api/amusement-parks
 */
export async function getAmusementParks(params: GetAmusementParksParams): Promise<GetAmusementParksResponse> {
  await new Promise(resolve => setTimeout(resolve, 200))

  let filtered = [...MOCK_AMUSEMENT_PARKS]

  if (params.name) {
    filtered = filtered.filter(r => r.name.includes(params.name!))
  }

  if (params.park_theme) {
    filtered = filtered.filter(r => r.park_theme === params.park_theme)
  }

  if (params.can_book !== undefined) {
    filtered = filtered.filter(r => {
      const canBook = r.booking_hours !== '不能预约'
      return canBook === params.can_book
    })
  }

  if (params.distance) {
    const { min, max } = parseDistance(params.distance)
    filtered = filtered.filter(r => {
      const distance = calculateDistance(r.x, r.y)
      return distance >= min && distance <= max
    })
  }

  const total = filtered.length

  const page = params.page || 1
  const page_size = params.page_size || 5
  const start = (page - 1) * page_size
  const end = start + page_size
  const list = filtered.slice(start, end)

  return {
    code: 0,
    data: { list, total, page, page_size },
    msg: 'success',
  }
}

export { type AmusementPark, type GetAmusementParksParams, type GetAmusementParksResponse }

export async function getParks(params: GetParksParams): Promise<GetParksResponse> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 200))

  let filtered = [...MOCK_PARKS]

  // 名字搜索
  if (params.name) {
    filtered = filtered.filter(r => r.name.includes(params.name!))
  }

  // 景点类型筛选
  if (params.spot_type) {
    filtered = filtered.filter(r => r.spot_type === params.spot_type)
  }

  // 人流量筛选
  if (params.crowd_density !== undefined) {
    filtered = filtered.filter(r => r.crowd_density === params.crowd_density)
  }

  // 是否可预约筛选
  if (params.can_book !== undefined) {
    filtered = filtered.filter(r => {
      const canBook = r.booking_hours !== '不能预约'
      return canBook === params.can_book
    })
  }

  // 距离筛选
  if (params.distance) {
    const { min, max } = parseDistance(params.distance)
    filtered = filtered.filter(r => {
      const distance = calculateDistance(r.x, r.y)
      return distance >= min && distance <= max
    })
  }

  const total = filtered.length

  // 分页
  const page = params.page || 1
  const page_size = params.page_size || 5
  const start = (page - 1) * page_size
  const end = start + page_size
  const list = filtered.slice(start, end)

  return {
    code: 0,
    data: {
      list,
      total,
      page,
      page_size,
    },
    msg: 'success',
  }
}
