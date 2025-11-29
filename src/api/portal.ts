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
  order_item_id?: number 
  product: PortalProduct
  quantity: number
  notes?: string 
  status?: OrderItemStatus 
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded'

export type ActiveOrder = {
  id: number
  items: PortalCartItem[]
  status: OrderStatus
  payment_status: PaymentStatus
  estimatedTime: string
  timestamp: number
}

export type TableSession = {
  id: string
  table_name: string
  restaurant_name: string
  currency: string
}

/* --------------------------- API --------------------------- */

export async function fetchPortalData(tableCode: string) {
  const res = await apiService.get<any>(`/v1/portal/${tableCode}`)
  return res.data
}

export async function placePortalOrder(tableCode: string, items: PortalCartItem[]): Promise<ActiveOrder> {
  const res = await apiService.post<any>(`/v1/portal/${tableCode}/order`, { items })
  return { 
    id: res.data.id,
    items: items, 
    status: res.data.status,
    payment_status: 'unpaid', 
    estimatedTime: res.data.estimatedTime,
    timestamp: res.data.timestamp
  }
}

export async function updatePortalOrder(tableCode: string, orderId: number, items: PortalCartItem[]): Promise<ActiveOrder> {
  const res = await apiService.put<any>(`/v1/portal/${tableCode}/order/${orderId}`, { items })
  return { 
    id: orderId,
    items: items,
    status: res.data.status,
    payment_status: 'unpaid',
    estimatedTime: res.data.estimatedTime,
    timestamp: res.data.timestamp
  }
}

// --- REAL-TIME SUBSCRIPTION ---

type RealtimeCallbacks = {
    onOrderStatus: (newStatus: OrderStatus) => void;
    onItemStatus: (itemId: number, newStatus: OrderItemStatus) => void;
}

export function subscribeToOrderUpdates(orderId: number, callbacks: RealtimeCallbacks) {
  if (!echo) return () => {};

  // console.log(`Listening to PUBLIC channel: order.${orderId}`);

  // FIX: Use .channel() instead of .private() to skip authentication
  const channel = echo.channel(`order.${orderId}`);

  channel.listen('.order.status.updated', (e: any) => {
      // console.log('Order Status Event:', e);
      if (e.new_status) {
          callbacks.onOrderStatus(e.new_status as OrderStatus);
      }
  });

  channel.listen('.order.item.status.updated', (e: any) => {
      // console.log('Item Status Event:', e);
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