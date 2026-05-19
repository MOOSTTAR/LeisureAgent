import type { Plan, Booking, BookingStatus, ToolCallInfo } from "@/lib/types";

export interface AppState {
  plan: Plan | null;
  bookings: Booking[];
  isPlanPanelOpen: boolean;
  activeToolCalls: ToolCallInfo[];
  error: string | null;
}

export type AppAction =
  | { type: "SET_PLAN"; plan: Plan }
  | { type: "CLEAR_PLAN" }
  | { type: "TOGGLE_PLAN_PANEL" }
  | { type: "OPEN_PLAN_PANEL" }
  | { type: "CLOSE_PLAN_PANEL" }
  | { type: "ADD_BOOKING"; booking: Booking }
  | {
      type: "UPDATE_BOOKING_STATUS";
      bookingId: string;
      status: BookingStatus;
      confirmationCode?: string;
      errorMessage?: string;
    }
  | { type: "SET_ACTIVE_TOOL_CALLS"; toolCalls: ToolCallInfo[] }
  | { type: "SET_ERROR"; error: string }
  | { type: "CLEAR_ERROR" };
