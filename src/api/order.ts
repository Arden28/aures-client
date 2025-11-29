// src/api/order.ts
import apiService, { type ApiResult } from "@/api/apiService"

/* ------------------------ Types ------------------------ */

export type OrderStatusValue =
  | "pending"
  | 'preparing'
  | "ready"
  | "served"
  | "completed"
  | "cancelled"

export type PaymentStatusValue =
  | "unpaid"
  | "partial"
  | "paid"
  | "refunded"

export type OrderItemStatusValue =
  | "pending"
  | "cooking"
  | "ready"
  | "served"
  | "cancelled"

export type MiniRef = {
  id: number
  name: string
}

export type OrderItemMini = {
  id: number
  order_id: number
  product?: { id: number; name: string; price: number } | null
  quantity: number
  unit_price: number
  total_price: number
  status: string
  notes?: string | null
}

export type TransactionMini = {
  id: number
  amount: number
  method: string
  status: string
  processed_by?: MiniRef | null
  created_at?: string
}

export type Order = {
  id: number
  restaurant?: MiniRef | null
  table?: MiniRef | null
  client?: MiniRef | null
  waiter?: MiniRef | null

  status: OrderStatusValue
  source: string

  subtotal: number
  tax_amount: number | null
  service_charge: number | null
  discount_amount: number | null
  total: number
  paid_amount: number
  payment_status: PaymentStatusValue

  opened_at: string | null
  closed_at: string | null

  items?: OrderItemMini[]
  transactions?: TransactionMini[]
}

/* ------------ Filters & payloads ---------------- */

export type OrderFilters = {
  status?: OrderStatusValue
  page?: number
  per_page?: number
}

/**
 * Update metadata only (NOT status/payment).
 * Mirrors UpdateOrderRequest on the backend.
 */
export type OrderUpdatePayload = {
  table_id?: number | null
  client_id?: number | null
  discount_amount?: number | null
}

/**
 * Mirrors StoreOrderRequest on the backend.
 */
export type OrderCreateItemPayload = {
  product_id: number
  quantity: number
  notes?: string | null
}

export type OrderCreatePayload = {
  table_id?: number | null
  client_id?: number | null
  source?: string
  discount_amount?: number | null
  items: OrderCreateItemPayload[]
}

/**
 * Mirrors UpdateOrderStatusRequest
 */
export type OrderStatusUpdatePayload = {
  status: OrderStatusValue
}

/**
 * Mirrors UpdateOrderItemStatusRequest
 */
export type OrderItemStatusUpdatePayload = {
  status: OrderItemStatusValue
}

/* ---------------- Pagination & resource wrappers --------------- */

type PaginationMeta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

type OrderIndexResponse =
  | {
      data: Order[]
      meta?: PaginationMeta
      links?: Record<string, string | null>
    }
  | Order[]

type SingleOrderResponse = { data: Order } | Order

/* ------------------------ Helpers ---------------------- */

function normalizeOrderIndex(payload: OrderIndexResponse) {
  if (Array.isArray(payload)) {
    return {
      items: payload as Order[],
      meta: undefined as PaginationMeta | undefined,
    }
  }

  return {
    items: (payload.data ?? []) as Order[],
    meta: payload.meta,
  }
}

/**
 * Laravel OrderResource + normal order models.
 * Works with:
 * - { data: { ...order } }
 * - { message: "...", data: { ...order } }
 * - plain { ...order }
 */
function unwrapOrder(payload: any): Order {
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data as Order
  }
  return payload as Order
}

/* ------------------------ API: CRUD -------------------------- */

export async function fetchOrders(filters?: OrderFilters) {
  const res = await apiService.get<OrderIndexResponse>("/v1/orders", {
    params: filters as Record<string, unknown> | undefined,
  })

  return normalizeOrderIndex(res.data)
}

export async function fetchOrder(id: number) {
  const res = await apiService.get<SingleOrderResponse>(`/v1/orders/${id}`)
  return unwrapOrder(res.data)
}

export async function createOrder(body: OrderCreatePayload) {
  // backend returns { message, data: OrderResource }
  const res = await apiService.post<any, OrderCreatePayload>("/v1/orders", body)
  return unwrapOrder(res.data)
}

export async function updateOrder(id: number, body: OrderUpdatePayload) {
  // backend returns { message, data: OrderResource }
  const res = await apiService.put<any, OrderUpdatePayload>(
    `/v1/orders/${id}`,
    body
  )
  return unwrapOrder(res.data)
}

export async function deleteOrder(id: number) {
  const res = await apiService.delete<ApiResult<unknown>>(`/v1/orders/${id}`)
  return res
}

/* ------------------------ API: Status machines -------------------------- */

/**
 * PATCH /v1/orders/{order}/status
 * Moves order along the state machine:
 * PENDING → PREPARING → READY → SERVED → COMPLETED / CANCELLED
 */
export async function updateOrderStatus(
  id: number,
  body: OrderStatusUpdatePayload
) {
  const res = await apiService.patch<{
    message: string
    data: { old_status: string; new_status: string }
  }>(`/v1/orders/${id}/status`, body)

  return res.data
}

/**
 * PATCH /v1/order-items/{item}/status
 * Moves an order item along the KDS state machine:
 * PENDING → COOKING → READY → SERVED / CANCELLED
 */
export async function updateOrderItemStatus(
  itemId: number,
  body: OrderItemStatusUpdatePayload
) {
  const res = await apiService.patch<{
    message: string
    data: { old_status: string; new_status: string }
  }>(`/v1/order-items/${itemId}/status`, body)

  return res.data
}
