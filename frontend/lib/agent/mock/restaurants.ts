import type { RestaurantResult } from "@/lib/types";

export const MOCK_RESTAURANTS: RestaurantResult[] = [
  {
    id: "rst-1",
    name: "外婆家",
    type: "dining",
    cuisine: "江浙菜",
    rating: 4.5,
    distance: "1.8km",
    price: 80,
    features: ["家庭友好", "儿童座椅", "包间可选", "停车方便"],
    location: "银泰百货",
    address: "延安路258号银泰百货3楼",
    availableSlots: ["11:30", "12:00", "12:30", "17:00", "17:30", "18:00", "18:30"],
    capacity: 120,
    partySizeSupported: 8,
  },
  {
    id: "rst-2",
    name: "绿茶餐厅",
    type: "dining",
    cuisine: "杭帮菜",
    rating: 4.3,
    distance: "2.5km",
    price: 70,
    features: ["环境好", "适合约会", "江景位"],
    location: "龙井路",
    address: "西湖区龙井路83号",
    availableSlots: ["11:00", "11:30", "12:30", "17:30", "18:00"],
    capacity: 80,
    partySizeSupported: 6,
  },
  {
    id: "rst-3",
    name: "海底捞",
    type: "dining",
    cuisine: "火锅",
    rating: 4.6,
    distance: "1.2km",
    price: 120,
    features: ["服务好", "儿童友好", "免费美甲", "等位有小吃"],
    location: "万象城",
    address: "江干区富春路701号万象城5楼",
    availableSlots: ["11:00", "11:30", "12:00", "17:00", "17:30"],
    capacity: 150,
    partySizeSupported: 10,
  },
  {
    id: "rst-4",
    name: "鼎泰丰",
    type: "dining",
    cuisine: "点心",
    rating: 4.4,
    distance: "2.2km",
    price: 100,
    features: ["精致点心", "环境优雅", "适合家庭"],
    location: "万象城",
    address: "江干区富春路701号万象城B1",
    availableSlots: ["11:30", "12:00", "12:30", "17:30", "18:00", "18:30"],
    capacity: 60,
    partySizeSupported: 6,
  },
  {
    id: "rst-5",
    name: "西北莜面村",
    type: "dining",
    cuisine: "西北菜",
    rating: 4.2,
    distance: "3km",
    price: 60,
    features: ["份量大", "适合聚餐", "儿童友好"],
    location: "湖滨路",
    address: "上城区湖滨路18号",
    availableSlots: ["11:30", "12:00", "17:30", "18:00", "18:30", "19:00"],
    capacity: 100,
    partySizeSupported: 12,
  },
  {
    id: "rst-6",
    name: "日料亭",
    type: "dining",
    cuisine: "日料",
    rating: 4.5,
    distance: "2.8km",
    price: 150,
    features: ["食材新鲜", "环境安静", "包间可选"],
    location: "延安路",
    address: "延安路189号",
    availableSlots: ["11:30", "12:00", "12:30", "17:30", "18:00"],
    capacity: 40,
    partySizeSupported: 4,
  },
  {
    id: "rst-7",
    name: "披萨店",
    type: "dining",
    cuisine: "西餐",
    rating: 4.1,
    distance: "1.5km",
    price: 80,
    features: ["儿童喜欢", "出餐快", "停车方便"],
    location: "银泰百货",
    address: "延安路258号银泰百货B1",
    availableSlots: ["11:00", "11:30", "12:00", "12:30", "17:00", "17:30", "18:00", "18:30"],
    capacity: 70,
    partySizeSupported: 6,
  },
  {
    id: "rst-8",
    name: "泰国餐厅",
    type: "dining",
    cuisine: "东南亚",
    rating: 4.3,
    distance: "3.5km",
    price: 90,
    features: ["口味独特", "环境异域", "适合尝鲜"],
    location: "嘉里中心",
    address: "下城区延安路385号嘉里中心3楼",
    availableSlots: ["11:30", "12:00", "17:30", "18:30"],
    capacity: 55,
    partySizeSupported: 6,
  },
  {
    id: "rst-9",
    name: "美食广场",
    type: "dining",
    cuisine: "综合",
    rating: 4.0,
    distance: "1.8km",
    price: 40,
    features: ["选择多", "上餐快", "价格实惠", "无需等位"],
    location: "银泰百货",
    address: "延安路258号银泰百货B1",
    availableSlots: ["随时"],
    capacity: 300,
    partySizeSupported: 20,
  },
  {
    id: "rst-10",
    name: "健康轻食馆",
    type: "dining",
    cuisine: "轻食",
    rating: 4.4,
    distance: "2km",
    price: 60,
    features: ["低卡路里", "素食可选", "环境清新", "适合减肥"],
    location: "文三路",
    address: "西湖区文三路108号",
    availableSlots: ["11:30", "12:00", "12:30", "17:30", "18:00", "18:30"],
    capacity: 45,
    partySizeSupported: 4,
  },
];

export async function mockSearchRestaurants(
  cuisine?: string,
  distance?: string,
  partySize: number = 2,
  count: number = 3
): Promise<RestaurantResult[]> {
  await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));

  if (Math.random() < 0.05) {
    throw new Error("餐厅搜索服务暂时不可用，请稍后重试");
  }

  let filtered = MOCK_RESTAURANTS.filter((r) => r.partySizeSupported >= partySize);

  if (cuisine) {
    const key = cuisine.toLowerCase();
    const matched = filtered.filter(
      (r) =>
        r.cuisine.includes(key) ||
        r.features.some((f) => f.includes(key)) ||
        r.name.includes(key)
    );
    if (matched.length > 0) filtered = matched;
  }

  if (distance) {
    const maxKm = parseFloat(distance.replace(/[^0-9.]/g, ""));
    if (!isNaN(maxKm)) {
      filtered = filtered.filter((r) => {
        const d = parseFloat(r.distance.replace(/[^0-9.]/g, ""));
        return d <= maxKm;
      });
    }
  }

  return filtered.sort((a, b) => b.rating - a.rating).slice(0, count);
}

export async function mockCheckAvailability(
  restaurantName: string,
  time: string,
  partySize: number
): Promise<{ available: boolean; estimatedWait: string }> {
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));

  const restaurant = MOCK_RESTAURANTS.find(
    (r) => r.name === restaurantName
  );

  if (!restaurant) {
    return { available: false, estimatedWait: "未知" };
  }

  if (restaurant.name === "海底捞" && partySize > 4) {
    return { available: true, estimatedWait: "约15分钟" };
  }

  const hasSlot = restaurant.availableSlots.some((s) => {
    if (s === "随时") return true;
    const slotHour = parseInt(s.split(":")[0]);
    const requestedHour = parseInt(time.split(":")[0]);
    return Math.abs(slotHour - requestedHour) <= 0.5;
  });

  if (hasSlot) {
    return { available: true, estimatedWait: "无需等位" };
  }

  return { available: false, estimatedWait: "需等位约30分钟" };
}
