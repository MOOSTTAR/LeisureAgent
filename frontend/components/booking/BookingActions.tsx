"use client";

import { Button } from "@/components/ui/button";
import type { Booking } from "@/lib/types";

interface Props {
  booking: Booking;
  onAction: (action: string, bookingId: string) => void;
}

export function BookingActions({ booking, onAction }: Props) {
  switch (booking.status) {
    case "idle":
      return (
        <Button
          size="sm"
          className="text-xs"
          onClick={() => onAction("book", booking.id)}
        >
          预订
        </Button>
      );

    case "pending":
    case "confirming":
      return (
        <Button
          size="sm"
          variant="outline"
          className="text-xs"
          onClick={() => onAction("cancel", booking.id)}
        >
          取消
        </Button>
      );

    case "confirmed":
      return (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="text-xs">
            查看详情
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-destructive"
            onClick={() => onAction("cancel", booking.id)}
          >
            取消预订
          </Button>
        </div>
      );

    case "failed":
      return (
        <Button
          size="sm"
          className="text-xs"
          onClick={() => onAction("retry", booking.id)}
        >
          重试
        </Button>
      );

    default:
      return null;
  }
}
