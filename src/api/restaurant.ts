// src/api/restaurant.ts
import apiService from "@/api/apiService"

export type RestaurantSettings = {
  ticket_prefix?: string | null
  enable_tips?: boolean
  kds_sound?: boolean
  order_timeout?: number | null // seconds
  auto_accept_online_orders?: boolean
  auto_close_paid_orders?: boolean
  enable_kds_auto_bump?: boolean
  receipt_footer?: string | null
}

export type Restaurant = {
  id: number
  name: string
  slug: string
  logo_path?: string | null
  currency: string
  timezone: string
  tax_rate: number | null
  service_charge_rate: number | null
  settings: RestaurantSettings | null
}

type RestaurantResponse = { status: "success"; data: Restaurant } | Restaurant

function unwrapRestaurant(payload: RestaurantResponse): Restaurant {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: Restaurant }).data
  }
  return payload as Restaurant
}

export async function fetchRestaurant() {
  const res = await apiService.get<RestaurantResponse>("/v1/restaurant")
  return unwrapRestaurant(res.data)
}

export type RestaurantUpdatePayload = {
  name: string
  currency: string
  timezone: string
  tax_rate?: number | null
  service_charge_rate?: number | null
  settings?: RestaurantSettings
}

export async function updateRestaurant(body: RestaurantUpdatePayload) {
  const res = await apiService.put<RestaurantResponse>("/v1/restaurant", body)
  return unwrapRestaurant(res.data)
}
