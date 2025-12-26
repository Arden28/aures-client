import * as React from "react"
import { Minus, Plus, X, ChefHat } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { formatMoney } from "@/lib/utils"
import { type PortalProduct } from "@/api/portal"

interface ProductDetailDrawerProps {
  product: PortalProduct | null
  currency: string
  // State from parent
  quantity: number
  setQuantity: (q: number) => void
  notes: string
  setNotes: (n: string) => void
  // Actions
  onClose: () => void
  onAddToCart: () => void
}

export default function ProductDetailDrawer({
  product,
  currency,
  quantity,
  setQuantity,
  notes,
  setNotes,
  onClose,
  onAddToCart,
}: ProductDetailDrawerProps) {
  
  if (!product) return null

  return (
    <Drawer open={!!product} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-w-lg mx-auto h-auto max-h-[94vh] sm:max-h-[85vh] sm:rounded-t-[2rem] mt-0 sm:mt-4 outline-none flex flex-col">
        
        {/* Scrollable Content */}
        <div className="mx-auto w-full flex-1 overflow-y-auto rounded-t-[inherit]">
          {/* Header Image */}
          <div className="p-0 relative">
            <div className="relative h-64 sm:h-80 w-full overflow-hidden rounded-t-[inherit] bg-muted">
              {product.image && (
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent opacity-80" />
              
              <DrawerClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white rounded-full h-10 w-10 backdrop-blur-sm"
                >
                  <X className="h-5 w-5" />
                </Button>
              </DrawerClose>
            </div>
          </div>

          {/* Details */}
          <div className="px-6 pt-6 pb-48">
            <DrawerHeader className="text-left p-0 space-y-4">
              <div className="flex flex-col gap-2">
                {product.is_popular && (
                  <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/10 w-fit">
                    Popular Choice
                  </span>
                )}
                <div className="flex justify-between items-start gap-4">
                  <DrawerTitle className="text-3xl font-extrabold leading-tight">
                    {product.name}
                  </DrawerTitle>
                </div>
                <span className="text-2xl font-bold text-primary">
                  {formatMoney(product.price, currency)}
                </span>
              </div>

              <p className="text-muted-foreground leading-relaxed text-lg">
                {product.description}
              </p>

              <div className="pt-4 space-y-3">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                  <ChefHat className="h-4 w-4" />
                  Special Instructions
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Allergies, removal of ingredients, extra sauce..."
                  className="resize-none bg-muted/30 border-border/50 focus:bg-background transition-all min-h-[80px] rounded-xl"
                />
              </div>
            </DrawerHeader>
          </div>
        </div>

        {/* Footer / Action Bar */}
        <div className="p-4 sm:p-6 border-t border-border/50 bg-background/80 backdrop-blur-md absolute bottom-0 left-0 right-0 rounded-b-[inherit]">
          <div className="flex items-center justify-between gap-4 mb-4">
            <span className="font-semibold text-lg">Quantity</span>
            <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/50">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-lg hover:bg-background hover:shadow-sm transition-all"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-5 w-5" />
              </Button>
              <span className="font-bold w-12 text-center tabular-nums text-lg">
                {quantity}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-lg hover:bg-background hover:shadow-sm transition-all"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <Button
            className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20"
            onClick={onAddToCart}
          >
            Add to Order &nbsp;&bull;&nbsp; {formatMoney(product.price * quantity, currency)}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}