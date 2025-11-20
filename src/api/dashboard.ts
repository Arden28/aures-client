// src/api/dashboard.ts
import apiService from "./apiService"
import { type ChartConfig } from "@/components/ui/chart"

/* ------------------------ Types ------------------------ */

export type DashboardTimeframe = "today" | "week" | "month" | "year"

export type RevenueSeriesPoint = {
  label: string // e.g. "09:00" or "Nov 20"
  total: number
}

export type OrdersSeriesPoint = {
  label: string
  dine_in: number
  online: number
  takeaway: number
}

export type TopProduct = {
  id: number
  name: string
  category: string
  total_quantity: number
  total_revenue: number
}

export type FloorPlanOccupancy = {
  id: number
  name: string
  total_tables: number
  occupied_tables: number
  reserved_tables: number
  needs_cleaning_tables: number
}

export type RecentOrder = {
  id: number
  code: string
  table_name: string | null
  waiter_name: string | null
  client_name: string | null
  status: string
  payment_status: string
  total: number
  opened_at: string
}

export type StaffWaiterPerformance = {
  id: number
  name: string
  role: string
  total_orders: number
  total_revenue: number
  average_order_value: number
  active_orders: number
  completed_orders: number
}

export type StaffCashierPerformance = {
  id: number
  name: string
  role: string
  payments_count: number
  total_processed: number
}

export type StaffPerformance = {
  waiters: StaffWaiterPerformance[]
  cashiers: StaffCashierPerformance[]
} | null

export type DashboardOverview = {
  currency: string
  timeframe: DashboardTimeframe

  // High level KPIs
  metrics: {
    total_revenue: number
    total_orders: number
    average_order_value: number
    active_orders: number
    completed_today: number
    occupancy_rate: number // 0–100
  }

  // Charts
  revenue_series: RevenueSeriesPoint[]
  orders_series: OrdersSeriesPoint[]

  // Breakdowns
  orders_by_status: {
    pending: number
    in_progress: number
    ready: number
    served: number
    completed: number
    cancelled: number
  }

  orders_by_source: {
    dine_in: number
    online: number
    takeaway: number
  }

  payment_breakdown: {
    unpaid: number
    partial: number
    paid: number
    refunded: number
  }

  // Details
  top_products: TopProduct[]
  floor_plans: FloorPlanOccupancy[]
  recent_orders: RecentOrder[]

  // Staff (only for owner/manager)
  staff_performance?: StaffPerformance
}

type DashboardApiResponse = {
  status: "success"
  data: DashboardOverview
}

/* ------------------------ API -------------------------- */

export async function fetchDashboardOverview(
  timeframe: DashboardTimeframe = "today"
): Promise<DashboardOverview> {
  const res = await apiService.get<DashboardApiResponse>("/v1/dashboard/overview", {
    params: { timeframe },
  })

  return res.data.data
}

/* ---------------------- Charts config ------------------ */

export const revenueChartConfig: ChartConfig = {
  total: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
}

export const ordersChartConfig: ChartConfig = {
  dine_in: {
    label: "Dine-in",
    color: "hsl(var(--chart-2))",
  },
  online: {
    label: "Online",
    color: "hsl(var(--chart-3))",
  },
  takeaway: {
    label: "Takeaway",
    color: "hsl(var(--chart-4))",
  },
}
