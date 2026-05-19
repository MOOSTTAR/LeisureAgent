import type { SearchResult } from "@/lib/types";

export const MOCK_ACTIVITIES: SearchResult[] = [
  {
    id: "act-1",
    name: "城市森林公园",
    type: "entertainment",
    rating: 4.7,
    distance: "2.5km",
    price: 0,
    features: ["免费", "适合亲子", "停车方便", "景色好"],
    location: "城市森林公园",
    address: "西湖区龙井路88号",
  },
  {
    id: "act-2",
    name: "亲子乐园",
    type: "entertainment",
    rating: 4.6,
    distance: "1.5km",
    price: 80,
    features: ["儿童友好", "室内空调", "亲子互动", "停车方便"],
    location: "欢乐亲子乐园",
    address: "西湖区文三路259号",
  },
  {
    id: "act-3",
    name: "西溪湿地公园",
    type: "entertainment",
    rating: 4.8,
    distance: "4km",
    price: 50,
    features: ["自然风光", "适合散步", "拍照打卡", "游船"],
    location: "西溪湿地公园",
    address: "西湖区天目山路518号",
  },
  {
    id: "act-4",
    name: "自然博物馆",
    type: "entertainment",
    rating: 4.4,
    distance: "3.5km",
    price: 0,
    features: ["免费", "适合亲子", "科普教育", "室内空调"],
    location: "浙江自然博物馆",
    address: "下城区西湖文化广场6号",
  },
  {
    id: "act-5",
    name: "银泰百货",
    type: "entertainment",
    rating: 4.3,
    distance: "1.8km",
    price: 0,
    features: ["免费逛", "室内空调", "儿童区", "停车方便", "餐饮齐全"],
    location: "银泰百货",
    address: "延安路258号",
  },
  {
    id: "act-6",
    name: "万象城",
    type: "entertainment",
    rating: 4.5,
    distance: "2.2km",
    price: 0,
    features: ["免费逛", "高端品牌", "室内溜冰场", "电影院"],
    location: "万象城",
    address: "江干区富春路701号",
  },
  {
    id: "act-7",
    name: "湖滨步行街",
    type: "extra",
    rating: 4.6,
    distance: "3km",
    price: 0,
    features: ["免费", "小吃街", "湖边风景", "适合散步"],
    location: "湖滨步行街",
    address: "上城区湖滨路",
  },
  {
    id: "act-8",
    name: "美术馆",
    type: "extra",
    rating: 4.2,
    distance: "4km",
    price: 0,
    features: ["免费", "艺术展览", "安静", "适合拍照"],
    location: "浙江美术馆",
    address: "上城区南山路138号",
  },
  {
    id: "act-9",
    name: "电影院",
    type: "entertainment",
    rating: 4.3,
    distance: "1.8km",
    price: 40,
    features: ["IMAX厅", "亲子场次", "停车方便"],
    location: "万象影城",
    address: "江干区富春路701号万象城4楼",
  },
  {
    id: "act-10",
    name: "植物园",
    type: "entertainment",
    rating: 4.5,
    distance: "3km",
    price: 10,
    features: ["自然风光", "适合亲子", "植物科普", "野餐区"],
    location: "杭州植物园",
    address: "西湖区桃源岭1号",
  },
];

export async function mockSearchActivities(
  query: string,
  distance?: string,
  count: number = 3
): Promise<SearchResult[]> {
  await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));

  if (Math.random() < 0.05) {
    throw new Error("搜索服务暂时不可用，请稍后重试");
  }

  const queryLower = query.toLowerCase();
  const keywords = ["亲子", "公园", "商场", "博物馆", "电影", "艺术", "散步", "乐园"];

  let filtered = MOCK_ACTIVITIES.filter((a) => {
    const hasKeyword = keywords.some((kw) =>
      queryLower.includes(kw) ||
      a.name.includes(kw) ||
      a.features.some((f) => f.includes(kw))
    );
    return hasKeyword || queryLower.length === 0;
  });

  if (filtered.length === 0) filtered = MOCK_ACTIVITIES;

  if (distance) {
    const maxKm = parseFloat(distance.replace(/[^0-9.]/g, ""));
    if (!isNaN(maxKm)) {
      filtered = filtered.filter((a) => {
        const d = parseFloat(a.distance.replace(/[^0-9.]/g, ""));
        return d <= maxKm;
      });
    }
  }

  return filtered.sort((a, b) => b.rating - a.rating).slice(0, count);
}
