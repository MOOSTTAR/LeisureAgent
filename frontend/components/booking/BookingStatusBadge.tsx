"use client";

import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X } from "lucide-react";
import type { BookingStatus } from "@/lib/types";

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon?: React.ReactNode }
> = {
  idle: { label: "待预订", variant: "outline" },
  pending: { label: "等待确认", variant: "secondary", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  confirming: { label: "确认中", variant: "secondary", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  confirmed: { label: "已确认", variant: "default", icon: <Check className="w-3 h-3" /> },
  failed: { label: "预订失败", variant: "destructive", icon: <X className="w-3 h-3" /> },
};

interface Props {
  status: BookingStatus;
  confirmationCode?: string;
}

export function BookingStatusBadge({ status, confirmationCode }: Props) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex items-center gap-1.5">
      <Badge variant={config.variant} className="text-xs gap-1">
        {config.icon}
        {config.label}
      </Badge>
      {confirmationCode && (
        <span className="text-xs text-muted-foreground font-mono">
          {confirmationCode}
        </span>
      )}
    </div>
  );
}
