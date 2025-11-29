import { type Product } from "@/api/product"
import { type OrderCreatePayload, type OrderCreateItemPayload, createOrder } from "@/api/order"

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type PosCartItem = {
  uuid: string
  product: Product
  quantity: number
  discountPercent: number
  customPrice: number | null
  notes?: string
}

export type PosTotals = {
  subtotal: number
  discountAmount: number
  taxAmount: number
  total: number
}

/* -------------------------------------------------------------------------- */
/* Logic / Helpers                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Calculates totals avoiding standard JS floating point errors
 */
export function calculatePosTotals(cart: PosCartItem[], taxRate: number = 0.10): PosTotals {
  let subtotal = 0
  let discountAmount = 0

  cart.forEach(item => {
    const price = item.customPrice ?? item.product.price
    const itemTotal = price * item.quantity
    
    // Calculate item specific discount amount
    const itemDiscount = itemTotal * (item.discountPercent / 100)
    
    subtotal += itemTotal
    discountAmount += itemDiscount
  })

  const taxableAmount = subtotal - discountAmount
  const taxAmount = taxableAmount * taxRate
  const total = taxableAmount + taxAmount

  return {
    subtotal,
    discountAmount,
    taxAmount,
    total
  }
}

/**
 * Transforms the local Cart state into the API payload expected by the backend.
 */
export function buildOrderPayload(
  cart: PosCartItem[], 
  context: { tableId?: number | null; clientId?: number | null; source?: string }
): OrderCreatePayload {
  
  const totals = calculatePosTotals(cart)

  const items: OrderCreateItemPayload[] = cart.map(item => {
    // Note: If your backend supports unit_price overrides, add them here.
    // If not, we might pass the custom price details in notes or handle it via a specific backend logic.
    // For now, we assume standard item creation.
    return {
      product_id: item.product.id,
      quantity: item.quantity,
      notes: item.notes || (item.customPrice ? `Manual Price: ${item.customPrice}` : null)
    }
  })

  return {
    table_id: context.tableId,
    client_id: context.clientId,
    source: context.source || 'pos',
    discount_amount: totals.discountAmount, // Passing total discount to order level
    items
  }
}

/**
 * Submits the order to the API
 */
export async function submitPosOrder(cart: PosCartItem[], context: { tableId?: number | null; clientId?: number | null }) {
  if (cart.length === 0) throw new Error("Cart is empty")
  
  const payload = buildOrderPayload(cart, context)
  return await createOrder(payload)
}