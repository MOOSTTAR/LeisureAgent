"use client";

import { Clock, Coins, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Plan } from "@/lib/types";

interface Props {
  plan: Plan;
  onBookAll: () => void;
}

export function PlanSummary({ plan, onBookAll }: Props) {
  return (
    <div className="space-y-3 pb-4 border-b">
      <h3 className="font-bold text-lg tracking-tight">{plan.title}</h3>

      <div className="flex gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
          {plan.totalDuration}
        </span>
        <span className="flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5" strokeWidth={1.5} />
          ¥{plan.totalBudget}
        </span>
        <span className="flex items-center gap-1.5">
          <List className="w-3.5 h-3.5" strokeWidth={1.5} />
          {plan.activities.length}项
        </span>
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" className="h-8 text-xs rounded-lg" onClick={onBookAll}>
          一键预订全部
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-xs rounded-lg">
          分享方案
        </Button>
      </div>
    </div>
  );
}
