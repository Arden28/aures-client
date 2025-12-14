import apiService from "@/api/apiService"
import { echo } from "@/lib/echo"

/* -------------------------- Types -------------------------- */
export type OrderItemStatus = 'pending' | 'cooking' | 'ready' | 'served' | 'cancelled'

export type PortalCategory = {
  id: number
  name: string
  slug: string
  image?: string
}

export type PortalProduct = {
  id: number
  category_id: number
  name: string
  description: string
  price: number
  image: string | null
  is_available: boolean
  is_popular?: boolean
}

export type PortalCartItem = {
  tempId: string 
  order_id?: number // ID of the specific order this item belongs to
  order_item_id?: number 
  product: PortalProduct
  quantity: number
  notes?: string 
  status?: OrderItemStatus 
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded'

// Aggregated Data for the entire Session
export type ActiveSessionData = {
  session_id: number // The ID of the TableSession
  status: OrderStatus // The status of the latest order (or aggregate status)
  items: PortalCartItem[] // AGGREGATED list of items from all session orders
  total_due: number // Sum of all orders in the session
  estimatedTime: string
  timestamp: number
}

// Session Metadata
export type TableSession = {
  id: number // Table ID
  table_name: string
  restaurant_name: string
  currency: string
  active_session_id: number | null
  session_status: string // e.g., 'active', 'waiting-payment'
}

/* --------------------------- API --------------------------- */

export async function fetchPortalData(tableCode: string) {
  const res = await apiService.get<any>(`/v1/portal/${tableCode}`)
  return res.data
}

export async function placePortalOrder(tableCode: string, sessionId: number | null, items: PortalCartItem[]): Promise<ActiveSessionData> {
  // Determine if we are updating an existing order (session)
  const payload = { items, session_id: sessionId }

  // We send the request
  await apiService.post<any>(`/v1/portal/${tableCode}/order`, payload)

  // IMPORTANT: We immediately re-fetch the full portal data to get the 
  // correct aggregated state (totals, item IDs, merged orders) from the server.
  const fullSessionData = await fetchPortalData(tableCode);
  
  // Return the aggregated active order data
  return fullSessionData.active_order as ActiveSessionData;
}

// NOTE: updatePortalOrder is removed/merged into placePortalOrder for session logic

// --- REAL-TIME SUBSCRIPTION ---

type RealtimeCallbacks = {
    onOrderStatus: (newStatus: OrderStatus) => void;
    onItemStatus: (itemId: number, newStatus: OrderItemStatus) => void;
}

export function subscribeToOrderUpdates(orderId: number, callbacks: RealtimeCallbacks) {
  if (!echo) return () => {};

  // Subscribe to the specific order channel
  const channel = echo.channel(`order.${orderId}`);

  channel.listen('.order.status.updated', (e: any) => {
      if (e.new_status) {
          callbacks.onOrderStatus(e.new_status as OrderStatus);
      }
  });

  channel.listen('.order.item.status.updated', (e: any) => {
      if (e.item_id && e.new_status) {
          callbacks.onItemStatus(e.item_id, e.new_status as OrderItemStatus);
      }
  });

  return () => {
      channel.stopListening('.order.status.updated');
      channel.stopListening('.order.item.status.updated');
      echo.leave(`order.${orderId}`);
  };
}