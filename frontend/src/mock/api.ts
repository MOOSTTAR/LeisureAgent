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

interface Restaurant {
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

// ==================== 公园 / Parks ====================

interface Park {
  id: number
  name: string
  address: string
  x: number
  y: number
  crowd_level: number // 1 稀少 2 适中 3 拥挤
}

interface GetParksParams {
  name?: string
  crowd_level?: number
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
    name: '朝阳公园',
    address: '朝阳区朝阳公园路 1 号',
    x: 800,
    y: 600,
    crowd_level: 2,
  },
  {
    id: 2,
    name: '颐和园',
    address: '海淀区新建宫门路 19 号',
    x: 2000,
    y: 1500,
    crowd_level: 3,
  },
  {
    id: 3,
    name: '圆明园',
    address: '海淀区清华西路 28 号',
    x: 1800,
    y: 1400,
    crowd_level: 2,
  },
  {
    id: 4,
    name: '奥林匹克森林公园',
    address: '朝阳区北辰东路 15 号',
    x: 1200,
    y: 1000,
    crowd_level: 1,
  },
  {
    id: 5,
    name: '玉渊潭公园',
    address: '海淀区西三环中路 10 号',
    x: 1000,
    y: 800,
    crowd_level: 2,
  },
  {
    id: 6,
    name: '北海公园',
    address: '西城区文津街 1 号',
    x: 500,
    y: 400,
    crowd_level: 3,
  },
  {
    id: 7,
    name: '中山公园',
    address: '东城区中华路 4 号',
    x: 400,
    y: 350,
    crowd_level: 2,
  },
  {
    id: 8,
    name: '景山公园',
    address: '西城区景山前街',
    x: 450,
    y: 380,
    crowd_level: 3,
  },
  {
    id: 9,
    name: '天坛公园',
    address: '东城区天坛内东里 7 号',
    x: 600,
    y: 500,
    crowd_level: 2,
  },
  {
    id: 10,
    name: '地坛公园',
    address: '东城区安定门外大街地坛公园',
    x: 700,
    y: 550,
    crowd_level: 1,
  },
  {
    id: 11,
    name: '日坛公园',
    address: '朝阳区朝阳门南大街 14 号',
    x: 550,
    y: 420,
    crowd_level: 1,
  },
  {
    id: 12,
    name: '月坛公园',
    address: '西城区月坛北街甲 6 号',
    x: 900,
    y: 700,
    crowd_level: 1,
  },
  {
    id: 13,
    name: '陶然亭公园',
    address: '西城区太平街 19 号',
    x: 350,
    y: 300,
    crowd_level: 2,
  },
  {
    id: 14,
    name: '紫竹院公园',
    address: '海淀区中关村南大街 33 号',
    x: 1100,
    y: 850,
    crowd_level: 1,
  },
  {
    id: 15,
    name: '北京动物园',
    address: '西城区西直门外大街 137 号',
    x: 950,
    y: 750,
    crowd_level: 3,
  },
  {
    id: 16,
    name: '北京植物园',
    address: '海淀区香山南路',
    x: 2500,
    y: 1800,
    crowd_level: 2,
  },
  {
    id: 17,
    name: '八大处公园',
    address: '石景山区八大处路 3 号',
    x: 2800,
    y: 2000,
    crowd_level: 1,
  },
  {
    id: 18,
    name: '龙潭公园',
    address: '东城区龙潭路 8 号',
    x: 750,
    y: 600,
    crowd_level: 1,
  },
  {
    id: 19,
    name: '红螺寺',
    address: '怀柔区红螺东路 2 号',
    x: 5000,
    y: 4000,
    crowd_level: 2,
  },
  {
    id: 20,
    name: '十渡风景区',
    address: '房山区十渡镇',
    x: 6000,
    y: 5000,
    crowd_level: 1,
  },
]

/**
 * 获取公园列表
 * GET /api/parks
 */
export async function getParks(params: GetParksParams): Promise<GetParksResponse> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 200))

  let filtered = [...MOCK_PARKS]

  // 名字搜索
  if (params.name) {
    filtered = filtered.filter(r => r.name.includes(params.name!))
  }

  // 人流量筛选
  if (params.crowd_level !== undefined) {
    filtered = filtered.filter(r => r.crowd_level === params.crowd_level)
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
