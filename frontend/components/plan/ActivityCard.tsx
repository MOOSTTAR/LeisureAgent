"use client";

import { motion } from "framer-motion";
import { MapPin, Star, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      transition={{ delay: index * 0.1, duration: 0.3 }}
    >
      <Card className={`border-l-4 ${COLOR_MAP[activity.type]} shadow-sm`}>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {activity.time}
            </div>
            <Badge variant="secondary" className="text-xs">
              {activity.duration}
            </Badge>
          </div>

          <h4 className="font-semibold">{activity.name}</h4>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            {activity.address}
          </div>

          <p className="text-xs text-muted-foreground">{activity.description}</p>

          <div className="flex flex-wrap gap-1">
            {activity.features.map((f) => (
              <Badge key={f} variant="outline" className="text-xs">
                {f}
              </Badge>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium text-primary">
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
              <Badge
                className="cursor-pointer hover:bg-primary/80 transition-colors text-xs"
                onClick={() => onBook(activity.id)}
              >
                预订
              </Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
