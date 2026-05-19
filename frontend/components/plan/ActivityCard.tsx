"use client";

import { motion } from "framer-motion";
import { MapPin, Star, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Activity, Booking } from "@/lib/types";
import { BookingStatusBadge } from "@/components/booking/BookingStatusBadge";

const COLOR_MAP = {
  entertainment: "border-l-green-500",
  dining: "border-l-orange-500",
  extra: "border-l-blue-500",
} as const;

interface Props {
  activity: Activity;
  booking?: Booking;
  onBook: (activityId: string) => void;
  index: number;
}

export function ActivityCard({ activity, booking, onBook, index }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, type: "spring", stiffness: 100, damping: 18 }}
      className={`border-l-2 ${COLOR_MAP[activity.type]} pl-4 py-1`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span className="tracking-tight">{activity.time}</span>
        </div>
        <Badge variant="secondary" className="text-[11px] font-normal">
          {activity.duration}
        </Badge>
      </div>

      <h4 className="font-semibold text-sm tracking-tight">{activity.name}</h4>

      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
        <MapPin className="w-3 h-3" strokeWidth={1.5} />
        {activity.address}
      </div>

      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{activity.description}</p>

      <div className="flex flex-wrap gap-1 mt-2">
        {activity.features.map((f) => (
          <Badge key={f} variant="outline" className="text-[10px] font-normal">
            {f}
          </Badge>
        ))}
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium tracking-tight">
            {activity.price === 0 ? "免费" : `¥${activity.price}/人`}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            {activity.rating}
          </span>
        </div>

        {booking ? (
          <BookingStatusBadge
            status={booking.status}
            confirmationCode={booking.confirmationCode}
          />
        ) : activity.type === "dining" || activity.price > 0 ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs rounded-lg"
            onClick={() => onBook(activity.id)}
          >
            预订
          </Button>
        ) : null}
      </div>
    </motion.div>
  );
}
