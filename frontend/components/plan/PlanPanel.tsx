"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Plan, Booking } from "@/lib/types";
import { PlanSummary } from "./PlanSummary";
import { PlanTimeline } from "./PlanTimeline";
import { useApp } from "@/lib/store/AppContext";

export function PlanPanel() {
  const { state, dispatch } = useApp();
  const { plan, bookings } = state;

  const handleBook = (activityId: string) => {
    const activity = plan?.activities.find((a) => a.id === activityId);
    if (activity) {
      onBookActivity(activityId);
    }
  };

  const onBookActivity = (activityId: string) => {
    const activity = plan?.activities.find((a) => a.id === activityId);
    if (!activity) return;

    dispatch({
      type: "ADD_BOOKING",
      booking: {
        id: `b-${Date.now()}`,
        planId: plan!.id,
        activityId,
        type: activity.type === "dining" ? "restaurant" : "ticket",
        status: "pending",
        activityName: activity.name,
        time: activity.time,
        price: activity.price,
      },
    });

    setTimeout(() => {
      dispatch({
        type: "UPDATE_BOOKING_STATUS",
        bookingId: `b-${Date.now()}`,
        status: "confirmed",
        confirmationCode: `BK${Date.now().toString(36).toUpperCase()}`,
      });
    }, 1500);
  };

  const handleBookAll = () => {
    if (!plan) return;
    plan.activities
      .filter((a) => a.type === "dining" || a.price > 0)
      .forEach((a) => onBookActivity(a.id));
  };

  return (
    <AnimatePresence>
      {state.isPlanPanelOpen && plan && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dispatch({ type: "CLOSE_PLAN_PANEL" })}
          />

          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-background shadow-2xl
                       h-[75vh] max-h-[700px]
                       md:top-0 md:bottom-0 md:left-auto md:w-[420px] md:rounded-none md:h-full"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold">活动方案</h3>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={() => dispatch({ type: "CLOSE_PLAN_PANEL" })}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <ScrollArea className="h-[calc(100%-49px)]">
              <div className="p-4 space-y-4">
                <PlanSummary plan={plan} onBookAll={handleBookAll} />
                <PlanTimeline
                  activities={plan.activities}
                  bookings={bookings}
                  onBook={handleBook}
                />
              </div>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
