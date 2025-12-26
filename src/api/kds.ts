import apiService from "@/api/apiService"
import { echo } from "@/lib/echo"

/* -------------------------- Types -------------------------- */

export type OrderStatusValue = 'pending' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled'
export type OrderItemStatusValue = 'pending' | 'cooking' | 'ready' | 'served' | 'cancelled'

export interface KDSTable {
    id: number
    name: string
}
export interface KDSStatusHistoryEntry {
    status: string;
    at: string; // "Y-m-d H:i:s"
    user_id?: number | null;
}

export interface KDSProduct {
    id: number
    name: string
    description?: string
    price?: number
    image?: string | null
    is_available?: boolean
    is_popular?: boolean
}

export interface KDSItem {
    id: number
    order_item_id?: number
    name: string 
    product: KDSProduct
    quantity: number
    notes?: string
    status: OrderItemStatusValue
}

export interface KDSOrder {
    id: number
    table?: KDSTable
    waiter?: { name: string }
    items: KDSItem[]
    status: OrderStatusValue
    opened_at: string 
    ticket_number?: string
    statusHistory?: KDSStatusHistoryEntry[];
}

/* -------------------------- API Calls -------------------------- */

export async function fetchKDSOrders(restaurantId?: number) {
    const res = await apiService.get<any>('/v1/orders', {
        params: {
            status: ['pending', 'preparing', 'ready', 'served'],
            per_page: 100
        }
    })
    
    // Robust extraction logic
    if (res.data && Array.isArray(res.data.data)) return res.data.data as KDSOrder[]
    if (res.data && Array.isArray(res.data)) return res.data as KDSOrder[]
    if (Array.isArray(res.data)) return res.data as KDSOrder[]
    if (Array.isArray(res)) return res as KDSOrder[]

    console.warn("Unexpected API Response format in fetchKDSOrders:", res);
    return []
}

export async function updateKDSOrderStatus(orderId: number, status: OrderStatusValue) {
    return apiService.patch(`/v1/orders/${orderId}/status`, { status })
}

export async function updateKDSItemStatus(itemId: number, status: OrderItemStatusValue) {
    return apiService.patch(`/v1/order-items/${itemId}/status`, { status })
}

/* -------------------------- Real-Time -------------------------- */

type KDSCallbacks = {
    onNewOrder: (order: KDSOrder) => void
    onOrderStatusUpdated: (orderId: number, newStatus: OrderStatusValue, tableId?: number) => void
    onItemStatusUpdated: (orderId: number, itemId: number, newStatus: OrderItemStatusValue) => void
}

export function subscribeToKitchen(restaurantId: number, callbacks: KDSCallbacks) {
    if (!echo) {
        console.warn("Echo not initialized")
        return () => {}
    }

    const channelName = `restaurant.${restaurantId}.kitchen`
    // console.log(`🔌 Subscribing to KDS Channel: ${channelName}`)

    const channel = echo.private(channelName)

    // 1. New Order Placed
    channel.listen('.order.created', (e: any) => {
        // console.log('🎟️ New Order Event:', e)
        if (e.order) {
            callbacks.onNewOrder(e.order)
        } else {
            console.error("Payload missing 'order' key", e)
        }
    })

    // 2. Order Moved (Updated for specific payload)
    channel.listen('.order.status.updated', (e: any) => {
        // Payload: { order_id: 53, table_id: 12, old_status: 'pending', new_status: 'preparing' }
        // console.log('📋 Order Status Update:', e)
        
        if (e.order_id && e.new_status) {
            callbacks.onOrderStatusUpdated(e.order_id, e.new_status, e.table_id)
        }
    })

    // 3. Item Updated
    channel.listen('.order.item.status.updated', (e: any) => {
        // console.log('🍔 Item Status Update:', e)
        if (e.order_id && e.item_id && e.new_status) {
            callbacks.onItemStatusUpdated(e.order_id, e.item_id, e.new_status)
        }
    })

    return () => {
        // console.log(`🔌 Unsubscribing from ${channelName}`)
        channel.stopListening('.order.created')
        channel.stopListening('.order.status.updated')
        channel.stopListening('.order.item.status.updated')
        echo.leave(channelName)
    }
}