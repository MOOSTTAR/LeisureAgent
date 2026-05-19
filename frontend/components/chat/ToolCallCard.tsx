"use client";

import { motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { ToolCallInfo } from "@/lib/types";

const LABEL_MAP: Record<string, string> = {
  searchActivities: "搜索活动场所",
  searchRestaurants: "搜索餐厅",
  checkAvailability: "查询可用时间",
  bookActivity: "预订中",
  orderDelivery: "下单配送",
  presentPlan: "生成方案",
};

export function ToolCallCard({ toolCall }: { toolCall: ToolCallInfo }) {
  const label = LABEL_MAP[toolCall.name] || toolCall.name;

  return (
    <motion.div
      className="flex items-center gap-2 px-3 py-1.5 my-1 rounded-lg bg-muted/50 text-xs"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
    >
      {toolCall.status === "running" && (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
      )}
      {toolCall.status === "completed" && (
        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
      )}
      {toolCall.status === "failed" && (
        <XCircle className="w-3.5 h-3.5 text-destructive" />
      )}
      <span className="text-muted-foreground">{label}</span>
      {toolCall.status === "running" && (
        <span className="text-muted-foreground/60">...</span>
      )}
      {toolCall.status === "completed" && toolCall.result && (
        <span className="text-muted-foreground/60 truncate max-w-[200px]">
          - {toolCall.result}
        </span>
      )}
    </motion.div>
  );
}
