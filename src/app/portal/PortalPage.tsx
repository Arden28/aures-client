"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { 
  ShoppingBag, 
  Minus, 
  Plus, 
  ChevronRight, 
  ChevronLeft,
  Search, 
  Flame, 
  CheckCircle2,
  X
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

import { 
  fetchPortalMenu, 
  fetchPortalSession, 
  placePortalOrder,
  type PortalCategory, 
  type PortalProduct, 
  type PortalCartItem,
  type TableSession
} from "@/api/portal"

/* -------------------------------------------------------------------------- */
/* Main Component                                                             */
/* -------------------------------------------------------------------------- */

export default function PortalPage() {
  // -- State
  const [isLoading, setIsLoading] = React.useState(true)
  const [session, setSession] = React.useState<TableSession | null>(null)
  const [categories, setCategories] = React.useState<PortalCategory[]>([])
  const [products, setProducts] = React.useState<PortalProduct[]>([])
  const [activeCategory, setActiveCategory] = React.useState("popular")
  
  // Cart State
  const [cart, setCart] = React.useState<PortalCartItem[]>([])
  const [isCartOpen, setIsCartOpen] = React.useState(false)
  const [isOrdering, setIsOrdering] = React.useState(false)
  const [orderPlaced, setOrderPlaced] = React.useState(false)

  // Product Detail Modal State
  const [selectedProduct, setSelectedProduct] = React.useState<PortalProduct | null>(null)
  const [tempQty, setTempQty] = React.useState(1)

  // Scroll Refs for Categories
  const categoryScrollRef = React.useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(true)

  // -- Derived
  const currency = session?.currency || "KES"
  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0)

  // -- Init
  React.useEffect(() => {
    async function load() {
      try {
        const tableCode = "table_123" 
        const [sessData, menuData] = await Promise.all([
          fetchPortalSession(tableCode),
          fetchPortalMenu(tableCode)
        ])
        setSession(sessData)
        setCategories(menuData.categories)
        setProducts(menuData.products)
      } catch (e) {
        toast.error("Could not load menu")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  // -- Category Scroll Logic
  const checkScroll = () => {
    if (categoryScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoryScrollRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = 300
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  React.useEffect(() => {
    const ref = categoryScrollRef.current
    if (ref) {
      ref.addEventListener('scroll', checkScroll)
      checkScroll()
    }
    return () => ref?.removeEventListener('scroll', checkScroll)
  }, [categories])


  // -- Handlers
  const handleAddToCart = () => {
    if (!selectedProduct) return
    
    setCart(prev => {
      const existing = prev.find(i => i.product.id === selectedProduct.id)
      if (existing) {
        return prev.map(i => i.product.id === selectedProduct.id 
          ? { ...i, quantity: i.quantity + tempQty } 
          : i
        )
      }
      return [...prev, { 
        tempId: crypto.randomUUID(), 
        product: selectedProduct, 
        quantity: tempQty 
      }]
    })
    
    toast.success(`Added ${tempQty}x ${selectedProduct.name}`)
    setSelectedProduct(null)
    setTempQty(1)
  }

  const handlePlaceOrder = async () => {
    if (!session) return
    setIsOrdering(true)
    try {
      await placePortalOrder(session, cart)
      setOrderPlaced(true)
      setCart([]) 
    } catch (e) {
      toast.error("Failed to place order")
    } finally {
      setIsOrdering(false)
    }
  }

  const filteredProducts = React.useMemo(() => {
    if (activeCategory === "popular") {
      return products.filter(p => p.is_popular)
    }
    const catId = categories.find(c => c.slug === activeCategory)?.id
    return products.filter(p => p.category_id === catId)
  }, [products, activeCategory, categories])

  // -- Render Loading
  if (isLoading) return <PortalSkeleton />

  // -- Render Success State
  if (orderPlaced) return <OrderSuccessView onReset={() => setOrderPlaced(false)} />

  return (
    <div className="relative min-h-[calc(100vh-4rem)] pb-32">
      
      {/* 1. Hero / Welcome */}
      <div className="px-6 py-8 md:py-12 text-center md:text-left space-y-2 max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
          {session?.restaurant_name || "Restaurant"}
        </h1>
        <p className="text-muted-foreground text-lg">
          You are seated at <span className="font-medium text-foreground">{session?.table_name}</span>. 
          Ready to order?
        </p>
      </div>

      {/* 2. Search Bar */}
      <div className="px-6 pb-2 md:pb-4 max-w-3xl mx-auto">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search for dishes, drinks, deserts..." 
            className="pl-10 h-12 rounded-2xl bg-muted/30 border-transparent shadow-sm focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-background transition-all"
          />
        </div>
      </div>

      {/* 3. Categories (Sticky + Enhanced Scroll) */}
      <div className="sticky top-[4rem] z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/40 py-2">
        <div className="relative max-w-7xl mx-auto px-2 md:px-6 flex items-center">
          
          {/* Desktop Left Arrow */}
          <div className={cn(
            "hidden md:flex absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 items-center justify-start pl-4 transition-opacity duration-300",
            !canScrollLeft && "opacity-0 pointer-events-none"
          )}>
             <Button 
                size="icon" 
                variant="outline" 
                className="h-8 w-8 rounded-full bg-background shadow-md border-border/60 hover:scale-110 transition-transform"
                onClick={() => scrollCategories('left')}
             >
                <ChevronLeft className="h-4 w-4" />
             </Button>
          </div>

          {/* Scroll Container */}
          <div 
            ref={categoryScrollRef}
            className="flex w-full overflow-x-auto gap-2 p-2 px-4 scrollbar-hide snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.slug)}
                className={cn(
                  "snap-start flex-shrink-0 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 ease-out select-none border",
                  activeCategory === cat.slug
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25 scale-100"
                    : "bg-card text-muted-foreground border-border/40 hover:bg-accent hover:text-foreground hover:border-border"
                )}
              >
                {cat.slug === "popular" && <Flame className={cn("h-4 w-4", activeCategory === cat.slug ? "text-white fill-white" : "text-orange-500 fill-orange-500")} />}
                {cat.name}
              </button>
            ))}
          </div>

          {/* Desktop Right Arrow */}
          <div className={cn(
            "hidden md:flex absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 items-center justify-end pr-4 transition-opacity duration-300",
            !canScrollRight && "opacity-0 pointer-events-none"
          )}>
             <Button 
                size="icon" 
                variant="outline" 
                className="h-8 w-8 rounded-full bg-background shadow-md border-border/60 hover:scale-110 transition-transform"
                onClick={() => scrollCategories('right')}
             >
                <ChevronRight className="h-4 w-4" />
             </Button>
          </div>
        </div>
      </div>

      {/* 4. Product Grid (Responsive) */}
      <div className="px-4 md:px-6 py-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredProducts.map((product) => (
            <div 
              key={product.id}
              onClick={() => {
                setTempQty(1)
                setSelectedProduct(product)
              }}
              className="group relative flex sm:flex-col gap-4 p-3 md:p-4 rounded-3xl border border-border/40 bg-card/50 hover:bg-card hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer overflow-hidden"
            >
              {/* Image */}
              <div className="relative h-28 w-28 sm:h-48 sm:w-full shrink-0 overflow-hidden rounded-2xl bg-muted">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {product.is_popular && (
                  <div className="absolute left-2 top-2 rounded-full bg-orange-500/90 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    POPULAR
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex flex-1 flex-col justify-between">
                <div className="space-y-1.5">
                  <h3 className="font-bold text-lg text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                </div>
                
                <div className="flex items-end justify-between mt-4">
                  <span className="font-bold text-lg text-primary">
                    {formatMoney(product.price, currency)}
                  </span>
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <Plus className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Floating Cart Button */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-0 right-0 z-50 px-4 pointer-events-none"
          >
            <div className="max-w-md mx-auto pointer-events-auto">
              <Button 
                size="lg" 
                onClick={() => setIsCartOpen(true)}
                className="w-full h-16 rounded-full bg-primary text-primary-foreground shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-[1.02] hover:bg-primary/90 hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all flex items-center justify-between px-6 border-2 border-white/10"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background/20 backdrop-blur-sm text-sm font-bold">
                    {cartCount}
                  </div>
                  <div className="flex flex-col items-start text-xs">
                    <span className="font-bold text-base">View Order</span>
                    <span className="opacity-80 font-normal">Finish your meal</span>
                  </div>
                </div>
                <span className="font-bold text-xl tracking-tight">
                  {formatMoney(cartTotal, currency)}
                </span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Product Detail Drawer (FIXED) */}
      <Drawer open={!!selectedProduct} onOpenChange={(o) => !o && setSelectedProduct(null)}>
        {/* Changes here:
          - sm:max-h-[85vh]: Constrains height on desktop so it doesn't reach the top.
          - sm:mt-4: Adds a little margin at the top on desktop.
          - sm:rounded-t-[2rem]: More pronounced rounding on desktop.
        */}
        <DrawerContent className="max-w-lg mx-auto h-auto max-h-[94vh] sm:max-h-[85vh] sm:rounded-t-[2rem] mt-0 sm:mt-4 outline-none flex flex-col">
          {selectedProduct && (
            // Added overflow-y-auto here so content scrolls inside the constrained height
            <div className="mx-auto w-full flex-1 overflow-y-auto rounded-t-[inherit]">
              <div className="p-0 relative">
                {/* Changes here:
                  - Removed aspect-video.
                  - Used fixed responsive heights: h-64 on mobile, sm:h-80 on desktop.
                */}
                <div className="relative h-64 sm:h-80 w-full overflow-hidden rounded-t-[inherit] bg-muted">
                  <img 
                    src={selectedProduct.image} 
                    alt={selectedProduct.name}
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent opacity-80" />
                  
                  {/* Close button overlaid on image */}
                  <DrawerClose asChild>
                    <Button variant="ghost" size="icon" className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white rounded-full h-10 w-10 backdrop-blur-sm">
                      <X className="h-5 w-5" />
                    </Button>
                  </DrawerClose>
                </div>
              </div>
              
              <div className="px-6 pt-6 pb-36">
                 <DrawerHeader className="text-left p-0 space-y-4">
                  <div className="flex flex-col gap-2">
                    {selectedProduct.is_popular && (
                      <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/10 w-fit">
                        Popular Choice
                      </span>
                    )}
                    <div className="flex justify-between items-start gap-4">
                       <DrawerTitle className="text-3xl font-extrabold leading-tight">{selectedProduct.name}</DrawerTitle>
                    </div>
                     <span className="text-2xl font-bold text-primary">{formatMoney(selectedProduct.price, currency)}</span>
                  </div>
                  
                  <p className="text-muted-foreground leading-relaxed text-lg">
                    {selectedProduct.description}
                  </p>
                  
                  {selectedProduct.calories && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span>{selectedProduct.calories} kcal</span>
                    </div>
                  )}
                </DrawerHeader>

              </div>
            </div>
          )}

           {/* Fixed bottom section for Qty selector */}
           {selectedProduct && (
             <div className="p-4 sm:p-6 border-t border-border/50 bg-background/80 backdrop-blur-md absolute bottom-0 left-0 right-0 rounded-b-[inherit]">
               <div className="flex items-center justify-between gap-4 mb-4">
                   <span className="font-semibold text-lg">Quantity</span>
                   <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/50">
                     <Button 
                       variant="ghost" 
                       size="icon" 
                       className="h-10 w-10 rounded-lg hover:bg-background hover:shadow-sm transition-all"
                       onClick={() => setTempQty(Math.max(1, tempQty - 1))}
                     >
                       <Minus className="h-5 w-5" />
                     </Button>
                     <span className="font-bold w-12 text-center tabular-nums text-lg">
                       {tempQty}
                     </span>
                     <Button 
                       variant="ghost" 
                       size="icon" 
                       className="h-10 w-10 rounded-lg hover:bg-background hover:shadow-sm transition-all"
                       onClick={() => setTempQty(tempQty + 1)}
                     >
                       <Plus className="h-5 w-5" />
                     </Button>
                   </div>
               </div>
               <Button className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20" onClick={handleAddToCart}>
                 Add to Order &nbsp;&bull;&nbsp; {formatMoney(selectedProduct.price * tempQty, currency)}
               </Button>
             </div>
           )}
        </DrawerContent>
      </Drawer>

      {/* 7. Cart Drawer (FIXED) */}
      <Drawer open={isCartOpen} onOpenChange={setIsCartOpen}>
        {/* Changes here:
          - sm:h-[85vh]: Constrains height on desktop.
          - sm:mt-4, sm:rounded-t-[2rem]: Desktop specific styling for reachability.
        */}
        <DrawerContent className="max-w-lg mx-auto h-[92vh] sm:h-[85vh] sm:rounded-t-[2rem] mt-0 sm:mt-4 flex flex-col outline-none">
          <DrawerHeader className="border-b border-border/50 pb-4 shrink-0 relative flex items-center justify-center">
             <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="absolute left-4 hidden sm:flex">
                  <X className="h-5 w-5" />
                </Button>
            </DrawerClose>
            <DrawerTitle className="flex items-center gap-2 text-2xl font-bold">
              Current Order
            </DrawerTitle>
          </DrawerHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4 opacity-50 pb-12">
                <ShoppingBag className="h-24 w-24 stroke-[1]" />
                <p className="text-lg font-medium">Your cart is currently empty</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-backwards" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary text-sm font-bold border border-primary/20">
                      {item.quantity}x
                    </div>
                    <div>
                      <p className="font-bold text-base">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">{formatMoney(item.product.price, currency)} each</p>
                    </div>
                  </div>
                  <p className="font-bold text-base tabular-nums">
                    {formatMoney(item.product.price * item.quantity, currency)}
                  </p>
                </div>
              ))
            )}
          </div>

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
              onClick={handlePlaceOrder}
            >
              {isOrdering ? "Sending to Kitchen..." : "Confirm Order"}
              {!isOrdering && <ChevronRight className="h-5 w-5" />}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

    </div>
  )
}

/* -------------------------- Helpers -------------------------- */
// ... (Helpers remain the same as the previous response)
function OrderSuccessView({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center space-y-8 max-w-md mx-auto animate-in fade-in zoom-in duration-500">
      <div className="relative">
        <div className="absolute inset-0 bg-green-500 blur-2xl opacity-20 rounded-full" />
        <div className="relative h-28 w-28 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 border-4 border-white dark:border-background shadow-xl">
          <CheckCircle2 className="h-14 w-14" />
        </div>
      </div>
      <div className="space-y-3">
        <h2 className="text-3xl font-extrabold tracking-tight">Order Received!</h2>
        <p className="text-muted-foreground text-lg max-w-[260px] mx-auto leading-relaxed">
          The kitchen has started preparing your food. Sit back and relax.
        </p>
      </div>
      <Button variant="outline" size="lg" onClick={onReset} className="mt-8 min-w-[200px] rounded-full h-12 border-2">
        Order Something Else
      </Button>
    </div>
  )
}

function PortalSkeleton() {
  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      <div className="space-y-3">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-5 w-1/4" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1,2,3,4,5,6].map(i => (
           <Skeleton key={i} className="h-64 w-full rounded-3xl" />
        ))}
      </div>
    </div>
  )
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(amount)
}