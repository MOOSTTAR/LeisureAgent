import { tool } from "ai";
import { z } from "zod";
import {
  mockCheckAvailability,
  mockSearchRestaurants,
} from "@/lib/agent/mock/restaurants";
import { mockPlaceDelivery } from "@/lib/agent/mock/delivery";

export const checkAvailabilityTool = tool({
  description: "查询餐厅在指定时间是否有空位、预计等位时间。预订前必须先查询。",
  inputSchema: z.object({
    restaurantName: z.string().describe("餐厅名称"),
    time: z.string().describe("用餐时间，如'17:30'"),
    partySize: z.number().describe("用餐人数"),
  }),
  execute: async ({ restaurantName, time, partySize }) => {
    const result = await mockCheckAvailability(restaurantName, time, partySize);
    if (result.available) {
      return `${restaurantName} ${time} 有位置，${result.estimatedWait}`;
    }
    return `${restaurantName} ${time} 暂无位置，${result.estimatedWait}`;
  },
});

export const bookActivityTool = tool({
  description: "预订餐厅/门票/配送。用户确认方案后调用。",
  inputSchema: z.object({
    activityName: z.string().describe("要预订的活动或餐厅名称"),
    type: z
      .enum(["restaurant", "ticket", "delivery"])
      .describe("预订类型：restaurant=餐厅, ticket=门票, delivery=配送"),
    time: z.string().describe("时间，如'17:30'"),
    partySize: z.number().optional().describe("人数"),
    items: z.array(z.string()).optional().describe("配送商品列表"),
    notes: z.string().optional().describe("备注"),
  }),
  execute: async ({ activityName, type, time, partySize, items, notes }) => {
    if (type === "delivery" && items) {
      const result = await mockPlaceDelivery(
        items,
        notes || "收货地址待确认"
      );
      return `配送下单成功！\n确认码: ${result.confirmationCode}\n预计送达: ${result.eta}\n金额: ¥${result.price}`;
    }

    const code = `BK${Date.now().toString(36).toUpperCase()}`;
    const partyStr = partySize ? `，${partySize}位` : "";
    return `${type === "restaurant" ? "餐厅预订" : "门票预订"}成功！\n${activityName} ${time}${partyStr}\n确认码: ${code}\n请准时到达。`;
  },
});
