import * as React from "react"
import { 
  X, ShoppingBag, CheckCircle2, Plus, Minus, ChefHat, ChevronRight 
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { cn, formatMoney } from "@/lib/utils"
import { type PortalCartItem, type ActiveSessionData } from "@/api/portal"

interface CartDrawerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  cart: PortalCartItem[]
  activeSessionData: ActiveSessionData | null
  currency: string
  cartTotal: number
  isOrdering: boolean
  // Actions
  onIncrement: (index: number) => void
  onDecrement: (index: number) => void
  onSubmit: () => void
  // Helpers
  // ✅ FIXED: Allow string ("") or undefined return types from the parent logic
  isLocked: (status?: string) => boolean | string | undefined
}

export default function CartDrawer({
  isOpen,
  onOpenChange,
  cart,
  activeSessionData,
  currency,
  cartTotal,
  isOrdering,
  onIncrement,
  onDecrement,
  onSubmit,
  isLocked
}: CartDrawerProps) {
  
  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-lg mx-auto h-[92vh] sm:h-[85vh] sm:rounded-t-[2rem] mt-0 sm:mt-4 flex flex-col outline-none">
        
        {/* Header */}
        <DrawerHeader className="border-b border-border/50 pb-4 shrink-0 relative flex items-center justify-center">
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="absolute left-4 hidden sm:flex">
              <X className="h-5 w-5" />
            </Button>
          </DrawerClose>
          <DrawerTitle className="flex flex-col items-center gap-0.5">
            <span className="text-2xl font-bold">
              {activeSessionData ? "Modify Order" : "Current Order"}
            </span>
            {activeSessionData && (
              <span className="text-xs font-normal text-muted-foreground">Session Active</span>
            )}
          </DrawerTitle>
        </DrawerHeader>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4 opacity-50 pb-12">
              <ShoppingBag className="h-24 w-24 stroke-[1]" />
              <p className="text-lg font-medium">Your cart is currently empty</p>
            </div>
          ) : (
            cart.map((item, idx) => {
              // Force boolean conversion with (!!) to handle empty strings safely
              const locked = !!isLocked(item.status);

              return (
                <div
                  key={idx}
                  className={cn(
                    "flex items-start justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-backwards",
                    locked && "opacity-80"
                  )}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    {/* Qty Control / Lock Status */}
                    <div
                      className={cn(
                        "flex flex-col items-center justify-center rounded-xl border w-10 h-24 shrink-0",
                        locked
                          ? "bg-muted/40 border-transparent"
                          : "bg-muted/30 border-primary/20"
                      )}
                    >
                      {locked ? (
                        <div className="flex flex-col items-center justify-center gap-2 h-full text-muted-foreground">
                          <span className="font-bold text-lg">{item.quantity}</span>
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => onIncrement(idx)}
                            className="flex-1 w-full flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors rounded-t-xl"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>

                          <span className="font-bold text-sm py-1">{item.quantity}</span>

                          <button
                            onClick={() => onDecrement(idx)}
                            className="flex-1 w-full flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors rounded-b-xl"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Item Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-base">{item.product.name}</p>
                        {locked && item.status && (
                          <span className="text-[10px] uppercase font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">
                            {item.status}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatMoney(item.product.price, currency)} each
                      </p>
                      {item.notes && (
                        <div className="mt-1 flex items-start gap-1.5 text-xs text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400 p-1.5 rounded-md">
                          <ChefHat className="h-3 w-3 mt-0.5 shrink-0" />
                          <span className="italic leading-snug">"{item.notes}"</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Total Price */}
                  <p className="font-bold text-base tabular-nums">
                    {formatMoney(item.product.price * item.quantity, currency)}
                  </p>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-6 bg-muted/30 shrink-0 space-y-6 pb-10 sm:pb-6 sm:rounded-b-[2rem]">
          <div className="space-y-3">
            <div className="flex justify-between text-base">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatMoney(cartTotal, currency)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span className="text-primary">{formatMoney(cartTotal, currency)}</span>
            </div>
          </div>

          <Button
            className="w-full h-14 text-lg font-bold rounded-2xl gap-2 shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all"
            disabled={cart.length === 0 || isOrdering}
            onClick={onSubmit}
          >
            {isOrdering
              ? "Sending to Kitchen..."
              : activeSessionData
              ? "Update Tab"
              : "Place Order"}
            {!isOrdering && <ChevronRight className="h-5 w-5" />}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}