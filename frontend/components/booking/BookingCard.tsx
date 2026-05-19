"use client";

import { Clock, Users, Coins, Ticket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { BookingActions } from "./BookingActions";
import type { Booking } from "@/lib/types";

interface Props {
  booking: Booking;
  onAction: (action: string, bookingId: string) => void;
}

export function BookingCard({ booking, onAction }: Props) {
  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">{booking.activityName}</span>
          <BookingStatusBadge
            status={booking.status}
            confirmationCode={booking.confirmationCode}
          />
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {booking.time}
          </span>
          {booking.partySize && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {booking.partySize}位
            </span>
          )}
          <span className="flex items-center gap-1">
            <Coins className="w-3 h-3" />¥{booking.price}
          </span>
          {booking.confirmationCode && (
            <span className="flex items-center gap-1">
              <Ticket className="w-3 h-3" />
              {booking.confirmationCode}
            </span>
          )}
        </div>

        {booking.errorMessage && (
          <p className="text-xs text-destructive">{booking.errorMessage}</p>
        )}

        <BookingActions booking={booking} onAction={onAction} />
      </CardContent>
    </Card>
  );
}
