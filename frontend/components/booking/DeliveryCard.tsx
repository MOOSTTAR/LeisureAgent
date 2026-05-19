"use client";

import { Truck, MapPin, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { BookingActions } from "./BookingActions";
import type { Booking } from "@/lib/types";

interface Props {
  booking: Booking;
  onAction: (action: string, bookingId: string) => void;
}

export function DeliveryCard({ booking, onAction }: Props) {
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 font-medium text-sm">
            <Package className="w-4 h-4" />
            外卖配送
          </span>
          <BookingStatusBadge
            status={booking.status}
            confirmationCode={booking.confirmationCode}
          />
        </div>

        {booking.items && (
          <p className="text-sm">{booking.items.join("、")}</p>
        )}

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {booking.estimatedWait && (
            <span className="flex items-center gap-1">
              <Truck className="w-3 h-3" />
              {booking.estimatedWait}
            </span>
          )}
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            送至目的地
          </span>
        </div>

        {booking.errorMessage && (
          <p className="text-xs text-destructive">{booking.errorMessage}</p>
        )}

        <BookingActions booking={booking} onAction={onAction} />
      </CardContent>
    </Card>
  );
}
