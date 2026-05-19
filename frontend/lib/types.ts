// ====== Activity & Plan Types ======

export type ActivityType = "entertainment" | "dining" | "extra";

export interface Activity {
  id: string;
  type: ActivityType;
  name: string;
  time: string;
  duration: string;
  location: string;
  address: string;
  description: string;
  price: number;
  rating: number;
  features: string[];
}

export interface Plan {
  id: string;
  title: string;
  createdAt: string;
  activities: Activity[];
  totalDuration: string;
  totalBudget: number;
}

// ====== Booking Types ======

export type BookingType = "restaurant" | "ticket" | "delivery";
export type BookingStatus =
  | "idle"
  | "pending"
  | "confirming"
  | "confirmed"
  | "failed";

export interface Booking {
  id: string;
  planId: string;
  activityId: string;
  type: BookingType;
  status: BookingStatus;
  activityName: string;
  time: string;
  partySize?: number;
  items?: string[];
  price: number;
  confirmationCode?: string;
  estimatedWait?: string;
  errorMessage?: string;
}

// ====== Chat Types ======

export interface ToolCallInfo {
  id: string;
  name: string;
  label: string;
  status: "running" | "completed" | "failed";
  result?: string;
}

// ====== Agent Internal Types ======

export interface SearchResult {
  id: string;
  name: string;
  type: ActivityType;
  rating: number;
  distance: string;
  price: number;
  features: string[];
  location: string;
  address: string;
}

export interface RestaurantResult extends SearchResult {
  cuisine: string;
  availableSlots: string[];
  capacity: number;
  partySizeSupported: number;
}

export interface AgentContext {
  userInput: string;
  partySize: number;
  preferences: string[];
  maxDistance: string;
  budget?: number;
}
