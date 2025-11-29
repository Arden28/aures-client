import apiService from "@/api/apiService"

/* -------------------------- Types -------------------------- */
// (Keep your existing Types: PortalCategory, PortalProduct, etc.)
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
  tempId: string // Used for React keys
  order_item_id?: number // Only exists if saved to DB
  product: PortalProduct
  quantity: number
  notes?: string 
  status?: OrderItemStatus // Used to lock UI
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled'

export type ActiveOrder = {
  id: number
  items: PortalCartItem[]
  status: OrderStatus
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

// We fetch everything in one call for performance, but export separate promises
// to match the component structure if needed, or helper functions.

export async function fetchPortalData(tableCode: string) {
  const res = await apiService.get<any>(`/v1/portal/${tableCode}`)
  return res.data
}

// Create New
export async function placePortalOrder(tableCode: string, items: PortalCartItem[]): Promise<ActiveOrder> {
  const res = await apiService.post<any>(`/v1/portal/${tableCode}/order`, { items })
  return { 
    id: res.data.id,
    items: items, // Optimistic return, actual hydration happens on re-fetch usually
    status: res.data.status,
    estimatedTime: res.data.estimatedTime,
    timestamp: res.data.timestamp
  }
}

// Update Existing
export async function updatePortalOrder(tableCode: string, orderId: number, items: PortalCartItem[]): Promise<ActiveOrder> {
  const res = await apiService.put<any>(`/v1/portal/${tableCode}/order/${orderId}`, { items })
  return { 
    id: orderId,
    items: items,
    status: res.data.status,
    estimatedTime: res.data.estimatedTime,
    timestamp: res.data.timestamp
  }
}

// WebSocket stub (Kept as simulation for now, requires Pusher/Reverb for real backend)
export function subscribeToOrderUpdates(orderId: number, onUpdate: (status: OrderStatus) => void) {
  // TODO: Replace with Laravel Reverb/Pusher
  const statuses: OrderStatus[] = ['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled']
  let currentIndex = 0

  const interval = setInterval(() => {
    currentIndex++
    if (currentIndex < statuses.length) {
      onUpdate(statuses[currentIndex])
    } else {
      clearInterval(interval)
    }
  }, 10000) 

  return () => clearInterval(interval)
}