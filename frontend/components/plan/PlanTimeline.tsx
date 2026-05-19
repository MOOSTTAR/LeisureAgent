"use client";

import { motion } from "framer-motion";
import { Navigation } from "lucide-react";
import type { Activity, Booking } from "@/lib/types";
import { ActivityCard } from "./ActivityCard";

interface Props {
  activities: Activity[];
  bookings: Booking[];
  onBook: (activityId: string) => void;
}

export function PlanTimeline({ activities, bookings, onBook }: Props) {
  return (
    <div className="relative pl-6">
      <motion.div
        className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-border"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: "top" }}
      />

      {activities.map((activity, i) => (
        <div key={activity.id} className="relative pb-4 last:pb-0">
          <motion.div
            className="absolute -left-[19px] top-6 w-4 h-4 rounded-full border-2 border-background bg-primary z-10"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.2, type: "spring", stiffness: 150, damping: 16 }}
          />

          {i > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 mb-2 -ml-2 text-xs text-muted-foreground">
              <Navigation className="w-3 h-3" strokeWidth={1.5} /> 步行/打车约15分钟
            </div>
          )}

          <ActivityCard
            activity={activity}
            booking={bookings.find((b) => b.activityId === activity.id)}
            onBook={onBook}
            index={i}
          />
        </div>
      ))}

      <motion.div
        className="text-xs text-muted-foreground text-center pt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        结束
      </motion.div>
    </div>
  );
}
