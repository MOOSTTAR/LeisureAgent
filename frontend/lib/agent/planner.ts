import { tool } from "ai";
import { z } from "zod";
import { searchActivitiesTool, searchRestaurantsTool } from "./tools/search";
import { checkAvailabilityTool, bookActivityTool } from "./tools/booking";
import { orderDeliveryTool } from "./tools/delivery";

export const presentPlanTool = tool({
  description:
    "向用户展示活动方案。必须在搜索完成后调用此工具，将方案以结构化数据呈现给用户。用户可以看到并确认后再执行预订。",
  inputSchema: z.object({
    title: z.string().describe("方案标题，如'周末家庭半日游'"),
    activities: z
      .array(
        z.object({
          id: z.string(),
          type: z.enum(["entertainment", "dining", "extra"]),
          name: z.string(),
          time: z.string(),
          duration: z.string(),
          location: z.string(),
          address: z.string(),
          description: z.string(),
          price: z.number(),
          rating: z.number(),
          features: z.array(z.string()),
        })
      )
      .describe("活动列表"),
    totalDuration: z.string().describe("总时长，如'约4.5小时'"),
    totalBudget: z.number().describe("总预算预估"),
  }),
  execute: async ({ title, activities, totalDuration, totalBudget }) => {
    return {
      id: `plan-${Date.now().toString(36)}`,
      title,
      createdAt: new Date().toISOString(),
      activities,
      totalDuration,
      totalBudget,
    };
  },
});

export const plannerTools = {
  searchActivities: searchActivitiesTool,
  searchRestaurants: searchRestaurantsTool,
  checkAvailability: checkAvailabilityTool,
  bookActivity: bookActivityTool,
  orderDelivery: orderDeliveryTool,
  presentPlan: presentPlanTool,
};
