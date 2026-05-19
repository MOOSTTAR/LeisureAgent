import { tool } from "ai";
import { z } from "zod";
import { mockPlaceDelivery } from "@/lib/agent/mock/delivery";

export const orderDeliveryTool = tool({
  description: "下单配送服务，将鲜花/蛋糕/零食等送至指定地址。",
  inputSchema: z.object({
    items: z.array(z.string()).describe("配送商品列表"),
    address: z.string().describe("收货地址"),
    notes: z.string().optional().describe("备注，如祝福语"),
  }),
  execute: async ({ items, address, notes }) => {
    const result = await mockPlaceDelivery(items, address);
    const notesStr = notes ? `\n备注: ${notes}` : "";
    return `配送下单成功！\n商品: ${items.join("、")}\n送至: ${address}\n确认码: ${result.confirmationCode}\n预计送达: ${result.eta}\n金额: ¥${result.price}${notesStr}`;
  },
});
