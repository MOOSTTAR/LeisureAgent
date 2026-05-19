import type { SearchResult } from "@/lib/types";

export const MOCK_DELIVERY_ITEMS: SearchResult[] = [
  {
    id: "dlv-1",
    name: "水果拼盘",
    type: "extra",
    rating: 4.6,
    distance: "1km",
    price: 30,
    features: ["新鲜现切", "多种水果", "适合分享"],
    location: "鲜果时光",
    address: "西湖区文三路45号",
  },
  {
    id: "dlv-2",
    name: "奶茶套餐",
    type: "extra",
    rating: 4.4,
    distance: "0.8km",
    price: 45,
    features: ["2杯装", "网红品牌", "可选甜度"],
    location: "喜茶",
    address: "延安路258号银泰百货1楼",
  },
  {
    id: "dlv-3",
    name: "蛋糕甜点",
    type: "extra",
    rating: 4.7,
    distance: "1.5km",
    price: 60,
    features: ["精致法式甜点", "生日蛋糕可选", "提前2小时预订"],
    location: "黑天鹅蛋糕",
    address: "西湖区龙井路12号",
  },
  {
    id: "dlv-4",
    name: "零食礼包",
    type: "extra",
    rating: 4.2,
    distance: "1km",
    price: 35,
    features: ["进口零食", "混合装", "适合出游"],
    location: "零食多",
    address: "延安路200号",
  },
  {
    id: "dlv-5",
    name: "冰淇淋桶",
    type: "extra",
    rating: 4.5,
    distance: "1.2km",
    price: 25,
    features: ["哈根达斯", "4种口味", "保温包装"],
    location: "哈根达斯",
    address: "江干区富春路701号万象城1楼",
  },
];

export async function mockSearchDelivery(
  query: string
): Promise<SearchResult[]> {
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));

  if (Math.random() < 0.05) {
    throw new Error("配送服务暂时不可用");
  }

  const q = query.toLowerCase();
  return MOCK_DELIVERY_ITEMS.filter(
    (d) =>
      d.name.includes(q) ||
      d.features.some((f) => f.includes(q)) ||
      q === ""
  );
}

export async function mockPlaceDelivery(
  items: string[],
  address: string
): Promise<{ confirmationCode: string; eta: string; price: number }> {
  await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));

  if (Math.random() < 0.05) {
    throw new Error("下单失败，请稍后重试");
  }

  const matchedItems = MOCK_DELIVERY_ITEMS.filter((d) =>
    items.some((item) => d.name.includes(item) || item.includes(d.name))
  );

  const totalPrice = matchedItems.reduce((sum, d) => sum + d.price, 0);
  const code = `DL${Date.now().toString(36).toUpperCase()}`;

  return {
    confirmationCode: code,
    eta: "约30分钟",
    price: totalPrice || items.length * 30,
  };
}
