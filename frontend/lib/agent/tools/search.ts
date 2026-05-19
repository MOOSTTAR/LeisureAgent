import { tool } from "ai";
import { z } from "zod";
import { mockSearchActivities } from "@/lib/agent/mock/activities";
import { mockSearchRestaurants } from "@/lib/agent/mock/restaurants";

export const searchActivitiesTool = tool({
  description:
    "搜索附近的娱乐活动场所。根据用户偏好搜索公园、博物馆、商场、亲子乐园等。",
  inputSchema: z.object({
    query: z.string().describe("搜索关键词，如'亲子 公园'、'博物馆'"),
    distance: z.string().optional().describe("距离限制，如'3km'"),
    count: z.number().optional().default(3).describe("返回结果数量"),
  }),
  execute: async ({ query, distance, count }) => {
    const results = await mockSearchActivities(query, distance, count);
    return results
      .map(
        (r) =>
          `- ${r.name} | ⭐${r.rating} | 📍${r.distance} | 💰${r.price === 0 ? "免费" : `¥${r.price}/人`}\n  ${r.features.join(" · ")}\n  ${r.address}`
      )
      .join("\n");
  },
});

export const searchRestaurantsTool = tool({
  description:
    "搜索附近的餐厅。支持按菜系、距离筛选，考虑用餐人数。",
  inputSchema: z.object({
    cuisine: z.string().optional().describe("菜系偏好，如'江浙菜'、'火锅'、'亲子友好'"),
    distance: z.string().optional().describe("距离限制，如'3km'"),
    partySize: z.number().optional().default(2).describe("用餐人数"),
    count: z.number().optional().default(3).describe("返回结果数量"),
  }),
  execute: async ({ cuisine, distance, partySize, count }) => {
    const results = await mockSearchRestaurants(cuisine, distance, partySize, count);
    return results
      .map(
        (r) =>
          `- ${r.name}（${r.cuisine}）| ⭐${r.rating} | 📍${r.distance} | 💰¥${r.price}/人 | 👥最多${r.partySizeSupported}人\n  ${r.features.join(" · ")}\n  ${r.address}`
      )
      .join("\n");
  },
});
