import type { AppState, AppAction } from "./types";

export const initialState: AppState = {
  plan: null,
  bookings: [],
  isPlanPanelOpen: false,
  activeToolCalls: [],
  error: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_PLAN":
      return {
        ...state,
        plan: action.plan,
        bookings: [],
        isPlanPanelOpen: true,
      };

    case "CLEAR_PLAN":
      return { ...state, plan: null, bookings: [], isPlanPanelOpen: false };

    case "TOGGLE_PLAN_PANEL":
      return { ...state, isPlanPanelOpen: !state.isPlanPanelOpen };

    case "OPEN_PLAN_PANEL":
      return { ...state, isPlanPanelOpen: true };

    case "CLOSE_PLAN_PANEL":
      return { ...state, isPlanPanelOpen: false };

    case "ADD_BOOKING":
      return { ...state, bookings: [...state.bookings, action.booking] };

    case "UPDATE_BOOKING_STATUS":
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.bookingId
            ? {
                ...b,
                status: action.status,
                confirmationCode:
                  action.confirmationCode ?? b.confirmationCode,
                errorMessage: action.errorMessage,
              }
            : b
        ),
      };

    case "SET_ACTIVE_TOOL_CALLS":
      return { ...state, activeToolCalls: action.toolCalls };

    case "SET_ERROR":
      return { ...state, error: action.error };

    case "CLEAR_ERROR":
      return { ...state, error: null };

    default:
      return state;
  }
}
