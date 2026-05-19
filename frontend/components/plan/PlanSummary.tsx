"use client";

import { Clock, Coins, List } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Plan } from "@/lib/types";

interface Props {
  plan: Plan;
  onBookAll: () => void;
}

export function PlanSummary({ plan, onBookAll }: Props) {
  return (
    <Card className="bg-gradient-to-br from-primary/5 to-background">
      <CardContent className="p-4 space-y-3">
        <h3 className="font-bold text-lg">{plan.title}</h3>

        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {plan.totalDuration}
          </span>
          <span className="flex items-center gap-1">
            <Coins className="w-3.5 h-3.5" />
            ¥{plan.totalBudget}
          </span>
          <span className="flex items-center gap-1">
            <List className="w-3.5 h-3.5" />
            {plan.activities.length}项
          </span>
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="sm" className="text-xs" onClick={onBookAll}>
            一键预订全部
          </Button>
          <Button size="sm" variant="outline" className="text-xs">
            分享方案
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
