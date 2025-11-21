// src/app/pos/PosRegister.tsx
"use client"

import * as React from "react"
import { 
  Search, 
  UtensilsCrossed, 
  Trash2, 
  Hash, 
  Percent, 
  DollarSign,
  Menu,
  ShoppingBag,
  Delete as DeleteIcon,
  ChevronLeft,
  AlertTriangle
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// API Imports
import { fetchProducts, type Product } from "@/api/product"
import { fetchCategories, type Category } from "@/api/category"
import { toast } from "sonner"

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type CartItem = {
  uuid: string
  product: Product
  quantity: number
  discountPercent: number
  customPrice: number | null
}

type CalcMode = "qty" | "disc" | "price"

/* -------------------------------------------------------------------------- */
/* Main Component                                                             */
/* -------------------------------------------------------------------------- */

export default function PosRegister() {
  // -- Data
  const [products, setProducts] = React.useState<Product[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  // -- UI
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<number | "all">("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [mobileTab, setMobileTab] = React.useState<"products" | "cart">("products")
  const [isClearCartOpen, setIsClearCartOpen] = React.useState(false)

  // -- Cart & Calc
  const [cart, setCart] = React.useState<CartItem[]>([])
  const [selectedItemUuid, setSelectedItemUuid] = React.useState<string | null>(null)
  const [calcMode, setCalcMode] = React.useState<CalcMode>("qty")
  
  const [overwriteNext, setOverwriteNext] = React.useState(true)

  // --------------------------------------------------------------------------
  // 1. Data Loading
  // --------------------------------------------------------------------------
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [prodData, catData] = await Promise.all([
          fetchProducts({ available: true }),
          fetchCategories({ is_active: true } as any),
        ])
        setProducts(prodData.items)
        setCategories(catData)
      } catch (error) {
        console.error(error)
        toast.error("Failed to load POS data")
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // --------------------------------------------------------------------------
  // 2. Keyboard Handling
  // --------------------------------------------------------------------------
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore inputs and if dialog is open
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (isClearCartOpen) return

      if (e.key >= '0' && e.key <= '9') {
        handleCalcNum(e.key)
      } else if (e.key === '.') {
        handleCalcNum('.')
      } else if (e.key === 'Backspace') {
        handleCalcBackspace()
      } else if (e.key === 'Enter') {
        if (cart.length > 0) toast.success("Payment Triggered (Keyboard)")
      } else if (e.key === 'Delete') {
        if(selectedItemUuid) removeItem(selectedItemUuid)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedItemUuid, calcMode, overwriteNext, cart, isClearCartOpen])

  // --------------------------------------------------------------------------
  // 3. Core Logic
  // --------------------------------------------------------------------------
  const filteredProducts = React.useMemo(() => {
    let filtered = products
    if (selectedCategoryId !== "all") {
      filtered = filtered.filter((p) => p.category_id === selectedCategoryId)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter((p) => 
        p.name.toLowerCase().includes(q) || 
        p.sku?.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [products, selectedCategoryId, searchQuery])

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(item => item.product.id === product.id && item.discountPercent === 0)
      
      if (existingIdx >= 0) {
        return prev.map((item, idx) => {
          if (idx === existingIdx) {
            return { ...item, quantity: item.quantity + 1 }
          }
          return item
        })
      }

      const newItem: CartItem = {
        uuid: crypto.randomUUID(),
        product,
        quantity: 1,
        discountPercent: 0,
        customPrice: null,
      }
      
      setTimeout(() => {
        setSelectedItemUuid(newItem.uuid)
        setOverwriteNext(true)
        setCalcMode("qty")
      }, 0)

      return [...prev, newItem]
    })
  }

  const selectItem = (uuid: string) => {
    setSelectedItemUuid(uuid)
    setOverwriteNext(true)
    setCalcMode("qty")
  }

  const removeItem = (uuid: string) => {
    setCart(prev => prev.filter(i => i.uuid !== uuid))
    if (selectedItemUuid === uuid) setSelectedItemUuid(null)
  }

  const handleClearCart = () => {
    setCart([])
    setIsClearCartOpen(false)
    setSelectedItemUuid(null)
    toast.info("Order cleared")
  }

  // --------------------------------------------------------------------------
  // 4. Calculator Engine
  // --------------------------------------------------------------------------
  const handleCalcNum = (numStr: string) => {
    if (!selectedItemUuid) return
    
    setCart(prev => prev.map(item => {
      if (item.uuid !== selectedItemUuid) return item

      const currentVal = getCurrentValue(item, calcMode)
      let newVal = 0

      if (overwriteNext) {
        newVal = numStr === '.' ? 0 : parseFloat(numStr)
      } else {
        const valStr = currentVal.toString()
        if (numStr === "." && valStr.includes(".")) return item
        if (valStr.replace('.','').length >= 6) return item
        newVal = parseFloat(valStr + numStr)
      }

      return applyValue(item, calcMode, newVal)
    }))

    setOverwriteNext(false)
  }

  const handleCalcBackspace = () => {
    if (!selectedItemUuid) return

    setCart(prev => prev.map(item => {
      if (item.uuid !== selectedItemUuid) return item

      if (overwriteNext) {
        return applyValue(item, calcMode, 0)
      }

      const currentVal = getCurrentValue(item, calcMode)
      const valStr = currentVal.toString()
      const newStr = valStr.slice(0, -1)
      const newVal = newStr === "" || newStr === "." ? 0 : parseFloat(newStr)

      return applyValue(item, calcMode, newVal)
    }))
  }

  const getCurrentValue = (item: CartItem, mode: CalcMode): number => {
    if (mode === "qty") return item.quantity
    if (mode === "disc") return item.discountPercent
    if (mode === "price") return item.customPrice ?? item.product.price
    return 0
  }

  const applyValue = (item: CartItem, mode: CalcMode, val: number): CartItem => {
    const copy = { ...item }
    if (mode === "qty") copy.quantity = val
    if (mode === "disc") copy.discountPercent = Math.min(val, 100)
    if (mode === "price") copy.customPrice = val
    return copy
  }

  // --------------------------------------------------------------------------
  // 5. Totals
  // --------------------------------------------------------------------------
  const { subtotal, tax, total } = React.useMemo(() => {
    const sub = cart.reduce((acc, item) => {
      const price = item.customPrice ?? item.product.price
      const finalPrice = price * (1 - item.discountPercent / 100)
      return acc + (finalPrice * item.quantity)
    }, 0)
    const t = sub * 0.10
    return { subtotal: sub, tax: t, total: sub + t }
  }, [cart])


  return (
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans text-foreground">
      
      {/* ================= LEFT: PRODUCT CATALOG ================= */}
      <div className={cn(
        "flex-1 flex flex-col h-full min-w-0 overflow-hidden transition-opacity duration-300",
        mobileTab === "cart" ? "hidden md:flex" : "flex"
      )}>
        
        {/* HEADER */}
        <div className="flex-none bg-card border-b border-border z-10 shadow-sm">
          <div className="px-4 py-3 md:px-6 md:py-4">
             <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-10 h-10 bg-muted/30 border-input focus-visible:ring-1 focus-visible:ring-ring rounded-full text-sm shadow-none transition-all placeholder:text-muted-foreground"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {/* Horizontal Carousel Categories */}
          <div className="w-full overflow-x-auto no-scrollbar px-4 md:px-6 pb-3">
            <div className="flex gap-2">
              <CategoryPill 
                label="All Items" 
                active={selectedCategoryId === "all"} 
                onClick={() => setSelectedCategoryId("all")} 
              />
              {categories.map(cat => (
                <CategoryPill 
                  key={cat.id} 
                  label={cat.name} 
                  active={selectedCategoryId === cat.id} 
                  onClick={() => setSelectedCategoryId(cat.id)} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* PRODUCT GRID */}
        <div className="flex-1 overflow-hidden bg-muted/10 relative">
           <ScrollArea className="h-full">
             <div className="p-4 md:p-6 pb-24 md:pb-6"> 
                {isLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({length: 8}).map((_,i) => <Skeleton key={i} className="h-40 rounded-2xl bg-muted" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredProducts.map(p => (
                      <ProductCard key={p.id} product={p} onClick={() => addToCart(p)} />
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="col-span-full h-60 flex items-center justify-center text-muted-foreground">
                        No products found
                      </div>
                    )}
                  </div>
                )}
             </div>
           </ScrollArea>
        </div>
      </div>


      {/* ================= RIGHT: CART & CALCULATOR ================= */}
      <div className={cn(
        "flex-col h-full bg-card border-l border-border z-20",
        "w-full md:w-[400px] lg:w-[440px]",
        mobileTab === "products" ? "hidden md:flex" : "flex"
      )}>
        
        {/* Cart Header */}
        <div className="flex-none h-14 flex items-center justify-between px-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
             <h2 className="font-bold text-lg tracking-tight text-card-foreground">Current Order</h2>
             <Badge variant="secondary" className="rounded-full px-2">
                {cart.length}
             </Badge>
          </div>
          <Button 
            variant="ghost" size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
            onClick={() => setIsClearCartOpen(true)}
            disabled={cart.length === 0}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-hidden bg-card relative">
          <ScrollArea className="h-full">
            <div className="pb-24 md:pb-0"> 
              {cart.length === 0 ? (
                <div className="h-60 flex flex-col items-center justify-center text-muted-foreground/50 gap-3 select-none mt-10">
                  <UtensilsCrossed className="h-12 w-12 stroke-[1.5]" />
                  <p className="text-sm font-medium">Cart is empty</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {cart.map((item) => (
                    <CartRow 
                      key={item.uuid} 
                      item={item} 
                      selected={selectedItemUuid === item.uuid}
                      onClick={() => selectItem(item.uuid)}
                      onRemove={() => removeItem(item.uuid)}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* FIXED BOTTOM AREA */}
        <div className="shrink-0 flex flex-col border-t border-border bg-card pb-[60px] md:pb-0">
            <div className="px-5 py-3 bg-muted/20 border-b border-border space-y-1">
               <div className="flex justify-between text-xs font-medium text-muted-foreground">
                  <span>Tax (10%)</span>
                  <span>{formatMoney(tax)}</span>
               </div>
               <div className="flex justify-between items-end">
                  <span className="text-sm font-bold text-card-foreground">Total</span>
                  <span className="text-xl font-extrabold tracking-tight text-primary">{formatMoney(total)}</span>
               </div>
            </div>

            {/* Calc Grid */}
            <div className="grid grid-cols-4 h-[240px] bg-border gap-px border-b border-border select-none">
               <CalcButton onClick={() => handleCalcNum("1")}>1</CalcButton>
               <CalcButton onClick={() => handleCalcNum("2")}>2</CalcButton>
               <CalcButton onClick={() => handleCalcNum("3")}>3</CalcButton>
               <ModeButton 
                  mode="qty" active={calcMode === "qty"} 
                  onClick={() => { setCalcMode("qty"); setOverwriteNext(true); }} 
                  icon={<Hash className="h-4 w-4" />}
                  label="Qty"
               />

               <CalcButton onClick={() => handleCalcNum("4")}>4</CalcButton>
               <CalcButton onClick={() => handleCalcNum("5")}>5</CalcButton>
               <CalcButton onClick={() => handleCalcNum("6")}>6</CalcButton>
               <ModeButton 
                  mode="disc" active={calcMode === "disc"} 
                  onClick={() => { setCalcMode("disc"); setOverwriteNext(true); }} 
                  icon={<Percent className="h-4 w-4" />}
                  label="Disc"
               />

               <CalcButton onClick={() => handleCalcNum("7")}>7</CalcButton>
               <CalcButton onClick={() => handleCalcNum("8")}>8</CalcButton>
               <CalcButton onClick={() => handleCalcNum("9")}>9</CalcButton>
               <ModeButton 
                  mode="price" active={calcMode === "price"} 
                  onClick={() => { setCalcMode("price"); setOverwriteNext(true); }} 
                  icon={<DollarSign className="h-4 w-4" />}
                  label="Price"
               />

               <CalcButton onClick={() => handleCalcBackspace()} className="active:bg-destructive/10 active:text-destructive">
                  <DeleteIcon className="h-5 w-5 text-muted-foreground" />
               </CalcButton>
               <CalcButton onClick={() => handleCalcNum("0")}>0</CalcButton>
               <CalcButton onClick={() => handleCalcNum(".")}>.</CalcButton>
               
               <button 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg flex items-center justify-center transition-colors active:scale-[0.98]"
                  onClick={() => toast.success(`Paid ${formatMoney(total)}`)}
               >
                  PAY
               </button>
            </div>
        </div>
      </div>


      {/* ================= MOBILE BOTTOM NAVIGATION ================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-[60px] bg-card border-t border-border flex z-50 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        <button 
          onClick={() => setMobileTab("products")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-bold tracking-wide transition-colors",
            mobileTab === "products" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Menu className={cn("h-6 w-6", mobileTab === "products" && "stroke-primary")} />
          MENU
        </button>
        <button 
          onClick={() => setMobileTab("cart")}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-bold tracking-wide transition-colors",
            mobileTab === "cart" ? "text-primary" : "text-muted-foreground"
          )}
        >
           <div className="relative">
              <ShoppingBag className={cn("h-6 w-6", mobileTab === "cart" && "stroke-primary")} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-primary text-primary-foreground text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center ring-2 ring-card">
                  {cart.length}
                </span>
              )}
           </div>
           ORDER
        </button>
      </div>

      {/* ================= DIALOGS ================= */}
      <Dialog open={isClearCartOpen} onOpenChange={setIsClearCartOpen}>
        <DialogContent className="sm:max-w-[425px] gap-0 p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Clear current order?
            </DialogTitle>
            <DialogDescription>
              This action will remove all {cart.length} items from the cart. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-muted/30 p-6 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsClearCartOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearCart}>
              Clear Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Sub-Components                                                             */
/* -------------------------------------------------------------------------- */

function ProductCard({ product, onClick }: { product: Product, onClick: () => void }) {
    const hasImage = !!product.image_path
    return (
        <button 
            onClick={onClick}
            className="group flex flex-col text-left h-full w-full bg-card border border-border rounded-2xl overflow-hidden hover:border-ring/50 transition-all active:scale-[0.97] duration-200 shadow-sm"
        >
            <div className={cn(
                "h-36 w-full bg-muted relative overflow-hidden", 
                !hasImage && "flex items-center justify-center"
            )}>
                {hasImage ? (
                    <img src={product.image_path!} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                   <span className="text-3xl font-bold text-muted-foreground/20">{product.name.slice(0,2).toUpperCase()}</span>
                )}
                <div className="absolute bottom-2 right-2 bg-card/95 backdrop-blur text-card-foreground text-xs font-bold px-2.5 py-1 rounded-full shadow-sm border border-border/50">
                     {formatMoney(product.price)}
                </div>
            </div>
            <div className="p-3 flex flex-col gap-1">
                <span className="text-sm font-bold text-card-foreground leading-tight line-clamp-2 group-hover:text-primary">
                    {product.name}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wide">
                    {product.sku || "ITEM"}
                </span>
            </div>
        </button>
    )
}

function CartRow({ item, selected, onClick, onRemove }: { item: CartItem, selected: boolean, onClick: () => void, onRemove: () => void }) {
    const unitPrice = item.customPrice ?? item.product.price
    const total = unitPrice * item.quantity * (1 - item.discountPercent/100)

    return (
        <div 
            onClick={onClick}
            className={cn(
                "flex items-stretch justify-between min-h-[76px] border-b border-border cursor-pointer transition-colors select-none relative group pl-4 pr-3",
                selected ? "bg-accent/50" : "bg-card hover:bg-muted/20"
            )}
        >
            {selected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}

            <div className="flex flex-col justify-center py-2 gap-1 flex-1">
                <span className={cn("text-sm font-bold leading-snug", selected ? "text-foreground" : "text-card-foreground")}>
                   {item.product.name}
                </span>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center bg-muted/50 rounded-md px-1.5 py-0.5 border border-border">
                       <span className="font-mono font-bold text-foreground">{item.quantity}</span>
                    </div>
                    <span className="text-muted-foreground/70">x</span>
                    <span>{formatMoney(unitPrice)}</span>
                    {item.discountPercent > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-primary/20 text-primary bg-primary/5">
                          -{item.discountPercent}%
                        </Badge>
                    )}
                </div>
            </div>

            <div className="flex flex-col items-end justify-center gap-1 py-2">
                 <span className="text-sm font-extrabold tabular-nums text-foreground">
                    {formatMoney(total)}
                </span>
                {selected && (
                  <button 
                     onClick={(e) => { e.stopPropagation(); onRemove(); }}
                     className="p-1.5 -mr-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                  >
                      <Trash2 className="h-4 w-4" />
                  </button>
                )}
            </div>
        </div>
    )
}

function CategoryPill({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "flex-none rounded-full px-4 py-2 text-xs font-bold border transition-all shadow-sm whitespace-nowrap snap-start",
                active 
                 ? "bg-primary text-primary-foreground border-primary" 
                 : "bg-card text-muted-foreground border-border hover:bg-muted hover:border-ring/50"
            )}
        >
            {label}
        </button>
    )
}

function CalcButton({ children, onClick, className }: { children: React.ReactNode, onClick: () => void, className?: string }) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "bg-card text-xl font-medium text-card-foreground hover:bg-accent/50 active:bg-accent transition-colors flex items-center justify-center h-full w-full outline-none focus:bg-accent/20",
                className
            )}
        >
            {children}
        </button>
    )
}

function ModeButton({ mode, active, onClick, icon, label }: { mode: string, active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 h-full w-full transition-all outline-none",
        active
          ? "bg-accent text-accent-foreground shadow-inner" 
          : "bg-card text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
      )}
    >
      <div className={cn("p-1 rounded", active ? "bg-background/50" : "")}>
        {icon}
      </div>
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  )
}

function formatMoney(amount: number) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(amount)
}