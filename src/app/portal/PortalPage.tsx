"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { 
  ShoppingBag, Minus, Plus, ChevronRight, ChevronLeft, Search, 
  Flame, CheckCircle2, X, ChefHat, Utensils, BellRing, Receipt,
  RotateCcw
} from "lucide-react"

import { cn, formatMoney } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

import { 
  fetchPortalData,
  placePortalOrder,
  subscribeToOrderUpdates,
  type PortalCategory, 
  type PortalProduct, 
  type PortalCartItem,
  type TableSession,
  type ActiveSessionData,
  type OrderStatus,
  type OrderItemStatus
} from "@/api/portal"
import { useSearchParams } from "react-router-dom"

/* -------------------------------------------------------------------------- */
/* Main Component                                                             */
/* -------------------------------------------------------------------------- */

export default function PortalPage() {
  const [searchParams] = useSearchParams()
  const tableCode = searchParams.get("table")

  // -- State
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [session, setSession] = React.useState<TableSession | null>(null)
  const [categories, setCategories] = React.useState<PortalCategory[]>([])
  const [products, setProducts] = React.useState<PortalProduct[]>([])
  const [activeCategory, setActiveCategory] = React.useState("popular")
  
  // Cart State (Represents the "Proposed" or "Current" Session Items)
  const [cart, setCart] = React.useState<PortalCartItem[]>([])
  const [isCartOpen, setIsCartOpen] = React.useState(false)
  const [isOrdering, setIsOrdering] = React.useState(false)
  
  // Active Session Tracking State
  const [activeSessionData, setActiveSessionData] = React.useState<ActiveSessionData | null>(null)
  const [isTrackerOpen, setIsTrackerOpen] = React.useState(false)

  // Product Detail Modal State
  const [selectedProduct, setSelectedProduct] = React.useState<PortalProduct | null>(null)
  const [tempQty, setTempQty] = React.useState(1)
  const [tempNotes, setTempNotes] = React.useState("") 

  // Scroll Refs for Categories
  const categoryScrollRef = React.useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(true)

  // -- Derived
  const currency = session?.currency || "USD"
  
  // Total logic: Sum of items currently in the frontend cart/view
  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0)
  
  // Helper to check if item is locked (already sent to kitchen)
  const isLocked = (status?: string) => status && status !== 'pending';

  // Logic: Can only modify if session is NOT closed
  const canModifyOrder = session?.session_status !== 'closed';
  
  // Check if paid (simplified for now based on session status)
  const isOrderPaid = session?.session_status === 'closed';

  // -- Init
  React.useEffect(() => {
    async function load() {
      if (!tableCode) {
        setError("No table code provided. Please scan the QR code again.")
        setIsLoading(false)
        return
      }

      try {
        const data = await fetchPortalData(tableCode)
        
        setSession(data.session)
        setCategories(data.menu.categories)
        setProducts(data.menu.products)
        
        // **HYDRATION MAGIC**
        if (data.active_order) {
            setActiveSessionData(data.active_order)
            // Load existing items into the cart view so they appear as "locked"
            setCart(data.active_order.items)
        }

      } catch (e) {
        console.error(e)
        setError("Invalid or expired table code.")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [tableCode])

  // -- Order Subscription Logic (REAL-TIME)
  React.useEffect(() => {
    // We need to subscribe to the LATEST order ID associated with this session items.
    // This allows us to get updates on the most recently placed items.
    if (activeSessionData && activeSessionData.items.length > 0 && session?.session_status !== 'closed') {
      
      // Find the highest order_id in the items list
      const latestOrderId = activeSessionData.items.reduce((max, item) => {
          return item.order_id ? Math.max(max, item.order_id) : max;
      }, 0);

      if (latestOrderId > 0) {
          const unsubscribe = subscribeToOrderUpdates(latestOrderId, {
            
            // 1. Handle Whole Order Status
            onOrderStatus: (newStatus) => {
                setActiveSessionData(prev => prev ? { ...prev, status: newStatus } : null)
                if (newStatus === 'served') {
                    toast.success("Items have been served!")
                }
            },

            // 2. Handle Individual Item Status
            onItemStatus: (itemId, newStatus) => {
                // Update the Cart View
                setCart(prev => prev.map(item => {
                    if (item.order_item_id === itemId) {
                        return { ...item, status: newStatus }
                    }
                    return item
                }))

                // Update the Session Data State
                setActiveSessionData(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        items: prev.items.map(item => 
                            item.order_item_id === itemId ? { ...item, status: newStatus } : item
                        )
                    }
                })
            }
          })

          return () => unsubscribe()
      }
    }
  }, [activeSessionData?.session_id, activeSessionData?.items, session?.session_status])

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
    
    // Guard
    if (!canModifyOrder) {
        toast.error("This session is closed. Please ask for the bill or start a new table.")
        return
    }

    setCart(prev => {
      // Check if item exists (matching ID, notes, and is pending)
      const existingIndex = prev.findIndex(i => 
        i.product.id === selectedProduct.id && 
        i.notes === tempNotes && 
        (!i.status || i.status === 'pending')
      )
      
      if (existingIndex >= 0) {
        // IMMUTABLE UPDATE
        const newCart = [...prev]
        newCart[existingIndex] = { 
            ...newCart[existingIndex], 
            quantity: newCart[existingIndex].quantity + tempQty 
        }
        return newCart
      }
      
      // Add new item
      return [...prev, { 
        tempId: crypto.randomUUID(), 
        product: selectedProduct, 
        quantity: tempQty,
        notes: tempNotes,
        status: 'pending' 
      }]
    })
    
    toast.success(`Added ${selectedProduct.name}`)
    setSelectedProduct(null)
    setTempQty(1)
    setTempNotes("") 
  }

  const handleRemoveItem = (itemIndex: number) => {
      const item = cart[itemIndex]
      
      if (isLocked(item.status)) {
          toast.error("Cannot remove items that are preparing.")
          return 
      }
      
      setCart(prev => prev.filter((_, i) => i !== itemIndex))
  }

  const handleDecrement = (itemIndex: number) => {
      const item = cart[itemIndex]
      
      if (isLocked(item.status)) {
           toast.error("Item is already preparing.")
           return 
      }

      if (item.quantity > 1) {
          setCart(prev => {
              const newCart = [...prev]
              newCart[itemIndex] = { 
                  ...newCart[itemIndex], 
                  quantity: newCart[itemIndex].quantity - 1 
              }
              return newCart
          })
      } else {
          handleRemoveItem(itemIndex)
      }
  }

  const handleIncrement = (itemIndex: number) => {
    const item = cart[itemIndex]
    
    if (isLocked(item.status)) {
         return 
    }

    setCart(prev => {
        const newCart = [...prev]
        newCart[itemIndex] = { 
            ...newCart[itemIndex], 
            quantity: newCart[itemIndex].quantity + 1 
        }
        return newCart
    })
  }

  const handleOrderSubmission = async () => {
    if (!session || !tableCode) return
    setIsOrdering(true)
    try {
      // 1. Submit the cart. We pass the active_session_id to link it.
      // The API returns the aggregated session data.
      const result: ActiveSessionData = await placePortalOrder(
          tableCode, 
          session.active_session_id, 
          cart
      )
      
      // 2. Update local state with the aggregated result
      setActiveSessionData(result)
      
      // 3. Update the cart to match the server state (this adds order_item_ids to new items)
      setCart(result.items)
      
      // 4. Update the session state (in case we just created a new one)
      if (!session.active_session_id) {
          setSession(prev => prev ? { ...prev, active_session_id: result.session_id } : null)
      }

      toast.success(session.active_session_id ? "Order updated successfully!" : "Order placed successfully!")
      
      setIsCartOpen(false)
      setIsTrackerOpen(true)

    } catch (e: any) {
      console.error(e)
      toast.error(e.message || "Failed to submit order.")
    } finally {
      setIsOrdering(false)
    }
  }

  // Reset Logic
  const handleNewOrder = () => {
      if(window.confirm("Start a brand new order? This will clear the current view.")) {
          setActiveSessionData(null)
          setCart([])
          toast.success("Ready for a new order!")
      }
  }

  const filteredProducts = React.useMemo(() => {
    if (activeCategory === "popular") return products.filter(p => p.is_popular)
    const catId = categories.find(c => c.slug === activeCategory)?.id
    return products.filter(p => p.category_id === catId)
  }, [products, activeCategory, categories])

  // -- Render States
  if (isLoading) return <PortalSkeleton />
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center space-y-4">
         <div className="bg-red-50 p-4 rounded-full">
            <X className="h-8 w-8 text-red-500" />
         </div>
         <h1 className="text-2xl font-bold">Oops!</h1>
         <p className="text-muted-foreground">{error}</p>
         <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] pb-36"> 
      
      {/* 1. Hero / Welcome */}
      <div className="px-6 py-8 md:py-12 text-center md:text-left space-y-2 max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
          {session?.restaurant_name || "Restaurant"}
        </h1>
        <p className="text-muted-foreground text-lg">
          You are seated at <span className="font-medium text-foreground">{session?.table_name}</span>. 
          Ready to order?
        </p>
        {activeSessionData && (
            <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mt-2",
                activeSessionData.status === 'served' ? "bg-indigo-100 text-indigo-700" : "bg-green-100 text-green-700"
            )}>
                <div className={cn("h-2 w-2 rounded-full animate-pulse", activeSessionData.status === 'served' ? "bg-indigo-500" : "bg-green-500")} />
                {activeSessionData.status === 'served' ? "All Items Served" : "Tab Open"}
            </div>
        )}
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

      {/* 3. Categories */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/40 py-2">
        <div className="relative max-w-7xl mx-auto px-2 md:px-6 flex items-center">
          <div className={cn(
            "hidden md:flex absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 items-center justify-start pl-4 transition-opacity duration-300",
            !canScrollLeft && "opacity-0 pointer-events-none"
          )}>
             <Button size="icon" variant="outline" className="h-8 w-8 rounded-full bg-background shadow-md border-border/60 hover:scale-110 transition-transform" onClick={() => scrollCategories('left')}>
                <ChevronLeft className="h-4 w-4" />
             </Button>
          </div>

          <div 
            ref={categoryScrollRef}
            className="flex w-full overflow-x-auto gap-2 p-2 px-4 scrollbar-hide snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
             <button
               onClick={() => setActiveCategory("popular")}
               className={cn(
                 "snap-start flex-shrink-0 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 ease-out select-none border",
                 activeCategory === "popular"
                   ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25 scale-100"
                   : "bg-card text-muted-foreground border-border/40 hover:bg-accent hover:text-foreground hover:border-border"
               )}
             >
               <Flame className={cn("h-4 w-4", activeCategory === "popular" ? "text-white fill-white" : "text-orange-500 fill-orange-500")} />
               Popular
             </button>

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
                {cat.name}
              </button>
            ))}
          </div>

          <div className={cn(
            "hidden md:flex absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 items-center justify-end pr-4 transition-opacity duration-300",
            !canScrollRight && "opacity-0 pointer-events-none"
          )}>
             <Button size="icon" variant="outline" className="h-8 w-8 rounded-full bg-background shadow-md border-border/60 hover:scale-110 transition-transform" onClick={() => scrollCategories('right')}>
                <ChevronRight className="h-4 w-4" />
             </Button>
          </div>
        </div>
      </div>

      {/* 4. Product Grid */}
      <div className="px-4 md:px-6 py-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredProducts.map((product) => (
            <div 
              key={product.id}
              onClick={() => {
                if (canModifyOrder) {
                    setTempQty(1); setTempNotes(""); setSelectedProduct(product)
                } else {
                    toast.info("Cannot add items. Session is closed.")
                }
              }}
              className={cn(
                  "group relative flex sm:flex-col gap-4 p-3 md:p-4 rounded-3xl border border-border/40 bg-card/50 hover:bg-card hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer overflow-hidden",
                  !canModifyOrder && "opacity-60 grayscale-[0.5] cursor-not-allowed"
              )}
            >
              <div className="relative h-28 w-28 sm:h-48 sm:w-full shrink-0 overflow-hidden rounded-2xl bg-muted">
                {product.image ? (
                   <img 
                    src={product.image} 
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                   <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground">
                      <Utensils className="h-8 w-8" />
                   </div>
                )}
               
                {product.is_popular && (
                  <div className="absolute left-2 top-2 rounded-full bg-orange-500/90 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    POPULAR
                  </div>
                )}
              </div>
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
                  {canModifyOrder && (
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                        <Plus className="h-4 w-4" />
                      </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Active Session Tracker Pill */}
      <AnimatePresence>
        {activeSessionData && !isTrackerOpen && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className={cn(
                "fixed right-4 sm:right-6 z-40 transition-all duration-500 ease-in-out",
                cartCount > 0 ? "bottom-24" : "bottom-6"
            )}
          >
             <Button 
               onClick={() => setIsTrackerOpen(true)}
               className="h-14 pl-2 pr-6 rounded-full bg-card border-2 border-primary/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-105 transition-all flex items-center gap-3"
             >
               <div className="relative h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                 <BellRing className="h-5 w-5 text-primary" />
                 {activeSessionData.status !== 'served' && <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse border-2 border-white" />}
               </div>
               <div className="flex flex-col items-start text-xs">
                   <span className="font-bold text-sm text-foreground">Track Order</span>
                   <div className="flex items-center gap-1.5 text-muted-foreground">
                     <span className={cn("h-1.5 w-1.5 rounded-full", activeSessionData.status === 'served' ? "bg-indigo-500" : "bg-orange-500")} />
                     <span className="capitalize">{activeSessionData.status}</span>
                   </div>
               </div>
             </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Floating Action Button Logic */}
      <AnimatePresence>
        {/* Scenario A: Can Modify -> Show Cart Button */}
        {cartCount > 0 && canModifyOrder && !isTrackerOpen && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-6 left-0 right-0 z-50 px-4 pointer-events-none">
            <div className="max-w-md mx-auto pointer-events-auto">
              <Button size="lg" onClick={() => setIsCartOpen(true)} className="w-full h-16 rounded-full bg-primary text-primary-foreground shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-[1.02] hover:bg-primary/90 hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all flex items-center justify-between px-6 border-2 border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background/20 backdrop-blur-sm text-sm font-bold">{cartCount}</div>
                  <div className="flex flex-col items-start text-xs"><span className="font-bold text-base">{activeSessionData ? "Update Order" : "View Order"}</span><span className="opacity-80 font-normal">Finish your meal</span></div>
                </div>
                <span className="font-bold text-xl tracking-tight">{formatMoney(cartTotal, currency)}</span>
              </Button>
            </div>
          </motion.div>
        )}

        {/* Scenario C: Paid -> Show New Order Button */}
        {isOrderPaid && !isTrackerOpen && (
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-6 left-0 right-0 z-50 px-4 pointer-events-none">
                <div className="max-w-md mx-auto pointer-events-auto">
                <Button size="lg" onClick={handleNewOrder} className="w-full h-16 rounded-full bg-primary text-primary-foreground shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-[1.02] hover:bg-primary/90 hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all flex items-center justify-center gap-3 border-2 border-white/10">
                    <RotateCcw className="h-5 w-5" />
                    <span className="font-bold text-lg">Start New Session</span>
                </Button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* 7. Product Detail Drawer */}
      <Drawer open={!!selectedProduct} onOpenChange={(o) => !o && setSelectedProduct(null)}>
        <DrawerContent className="max-w-lg mx-auto h-auto max-h-[94vh] sm:max-h-[85vh] sm:rounded-t-[2rem] mt-0 sm:mt-4 outline-none flex flex-col">
          {selectedProduct && (
            <div className="mx-auto w-full flex-1 overflow-y-auto rounded-t-[inherit]">
              <div className="p-0 relative">
                <div className="relative h-64 sm:h-80 w-full overflow-hidden rounded-t-[inherit] bg-muted">
                  {selectedProduct.image && (
                      <img 
                        src={selectedProduct.image} 
                        alt={selectedProduct.name}
                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent opacity-80" />
                  <DrawerClose asChild>
                    <Button variant="ghost" size="icon" className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white rounded-full h-10 w-10 backdrop-blur-sm">
                      <X className="h-5 w-5" />
                    </Button>
                  </DrawerClose>
                </div>
              </div>
              
              <div className="px-6 pt-6 pb-48">
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
                  
                  <div className="pt-4 space-y-3">
                    <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                      <ChefHat className="h-4 w-4" />
                      Special Instructions
                    </label>
                    <Textarea 
                      value={tempNotes}
                      onChange={(e) => setTempNotes(e.target.value)}
                      placeholder="Allergies, removal of ingredients, extra sauce..."
                      className="resize-none bg-muted/30 border-border/50 focus:bg-background transition-all min-h-[80px] rounded-xl"
                    />
                  </div>
                </DrawerHeader>
              </div>
            </div>
          )}

           {selectedProduct && (
             <div className="p-4 sm:p-6 border-t border-border/50 bg-background/80 backdrop-blur-md absolute bottom-0 left-0 right-0 rounded-b-[inherit]">
               <div className="flex items-center justify-between gap-4 mb-4">
                   <span className="font-semibold text-lg">Quantity</span>
                   <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/50">
                     <Button 
                       variant="ghost" size="icon" className="h-10 w-10 rounded-lg hover:bg-background hover:shadow-sm transition-all"
                       onClick={() => setTempQty(Math.max(1, tempQty - 1))}
                     >
                       <Minus className="h-5 w-5" />
                     </Button>
                     <span className="font-bold w-12 text-center tabular-nums text-lg">
                       {tempQty}
                     </span>
                     <Button 
                       variant="ghost" size="icon" className="h-10 w-10 rounded-lg hover:bg-background hover:shadow-sm transition-all"
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

      {/* 8. Cart Drawer (Only reachable if canModifyOrder is true) */}
      <Drawer open={isCartOpen} onOpenChange={setIsCartOpen}>
         <DrawerContent className="max-w-lg mx-auto h-[92vh] sm:h-[85vh] sm:rounded-t-[2rem] mt-0 sm:mt-4 flex flex-col outline-none">
          <DrawerHeader className="border-b border-border/50 pb-4 shrink-0 relative flex items-center justify-center">
              <DrawerClose asChild>
                 <Button variant="ghost" size="icon" className="absolute left-4 hidden sm:flex">
                   <X className="h-5 w-5" />
                 </Button>
             </DrawerClose>
             <DrawerTitle className="flex flex-col items-center gap-0.5">
               <span className="text-2xl font-bold">{activeSessionData ? "Modify Order" : "Current Order"}</span>
               {activeSessionData && <span className="text-xs font-normal text-muted-foreground">Session Active</span>}
             </DrawerTitle>
          </DrawerHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4 opacity-50 pb-12">
                <ShoppingBag className="h-24 w-24 stroke-[1]" />
                <p className="text-lg font-medium">Your cart is currently empty</p>
              </div>
            ) : (
              cart.map((item, idx) => {
                const locked = isLocked(item.status);

                return (
                    <div key={idx} className={cn("flex items-start justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-backwards", locked && "opacity-80")} style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className="flex items-center gap-4">
                        {/* Qty Control / Lock Status */}
                        <div className={cn("flex flex-col items-center justify-center rounded-xl border w-10 h-24 shrink-0", locked ? "bg-muted/40 border-transparent" : "bg-muted/30 border-primary/20")}>
                             {locked ? (
                                 <div className="flex flex-col items-center justify-center gap-2 h-full text-muted-foreground">
                                     <span className="font-bold text-lg">{item.quantity}</span>
                                     <div className="h-4 w-4 bg-current mask-lock" /> {/* CSS mask or similar, represented by check below if generic */}
                                     <CheckCircle2 className="h-4 w-4" />
                                 </div>
                             ) : (
                                 <>
                                     <button onClick={() => handleIncrement(idx)} className="flex-1 w-full flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors rounded-t-xl"><Plus className="h-3.5 w-3.5"/></button>
                                     
                                     <span className="font-bold text-sm py-1">{item.quantity}</span>
                                     
                                     <button onClick={() => handleDecrement(idx)} className="flex-1 w-full flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors rounded-b-xl"><Minus className="h-3.5 w-3.5"/></button>
                                  </>
                             )}
                        </div>

                        <div>
                        <div className="flex items-center gap-2">
                             <p className="font-bold text-base">{item.product.name}</p>
                             {locked && <span className="text-[10px] uppercase font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">{item.status}</span>}
                        </div>
                        <p className="text-sm text-muted-foreground">{formatMoney(item.product.price, currency)} each</p>
                        {item.notes && (
                            <div className="mt-1 flex items-start gap-1.5 text-xs text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400 p-1.5 rounded-md">
                            <ChefHat className="h-3 w-3 mt-0.5 shrink-0" />
                            <span className="italic leading-snug">"{item.notes}"</span>
                            </div>
                        )}
                        </div>
                    </div>
                    <p className="font-bold text-base tabular-nums">
                        {formatMoney(item.product.price * item.quantity, currency)}
                    </p>
                    </div>
                )
              })
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
              onClick={handleOrderSubmission}
            >
              {isOrdering ? "Sending to Kitchen..." : (activeSessionData ? "Update Tab" : "Place Order")}
              {!isOrdering && <ChevronRight className="h-5 w-5" />}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* 9. Live Order Tracker */}
      <LiveOrderTracker 
        isOpen={isTrackerOpen} 
        onClose={() => setIsTrackerOpen(false)} 
        sessionData={activeSessionData} 
        currency={currency}
      />

    </div>
  )
}

/* -------------------------- Sub-components -------------------------- */

function LiveOrderTracker({ isOpen, onClose, sessionData, currency }: { isOpen: boolean, onClose: () => void, sessionData: ActiveSessionData | null, currency: string }) {
    if (!sessionData) return null
  
    // Status mapping for visual timeline
    const steps: { id: OrderStatus, label: string, icon: React.ReactNode }[] = [
      { id: 'pending', label: 'Received', icon: <Receipt className="h-4 w-4" /> },
      { id: 'preparing', label: 'Preparing', icon: <ChefHat className="h-4 w-4" /> },
      { id: 'ready', label: 'On Way', icon: <Utensils className="h-4 w-4" /> },
      { id: 'served', label: 'Served', icon: <CheckCircle2 className="h-4 w-4" /> },
    ]
  
    const currentStepIndex = steps.findIndex(s => s.id === sessionData.status)
    const orderTotal = sessionData.total_due // Use the aggregated session total
  
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-w-lg mx-auto h-[90vh] sm:h-[85vh] sm:rounded-t-[2rem] mt-0 sm:mt-4 flex flex-col outline-none">
          
          {/* Header */}
          <DrawerHeader className="border-b border-border/50 pb-4 shrink-0 relative flex items-center justify-between px-6 pt-6">
             <div className="text-left">
               <DrawerTitle className="text-2xl font-bold flex items-center gap-2">
                 Session Status
                 <span className="flex h-2.5 w-2.5 relative">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                 </span>
               </DrawerTitle>
               <p className="text-sm text-muted-foreground font-medium mt-1">Session #{sessionData.session_id}</p>
             </div>
             <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full bg-muted/50 hover:bg-muted">
                  <X className="h-5 w-5" />
                </Button>
            </DrawerClose>
          </DrawerHeader>
  
          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto bg-muted/5">
              <div className="p-6 space-y-8">
                  
                  {/* 1. Status Pulse */}
                  <div className="flex justify-center py-4">
                      <div className="relative">
                         <div className={cn(
                           "h-40 w-40 rounded-full flex flex-col items-center justify-center border-4 shadow-xl transition-all duration-700",
                           sessionData.status === 'served' 
                             ? "bg-green-50 border-green-200 text-green-700" 
                             : "bg-background border-primary/10 text-foreground"
                         )}>
                            {sessionData.status === 'served' ? (
                               <>
                                 <CheckCircle2 className="h-10 w-10 mb-2 text-green-600" />
                                 <span className="font-bold text-lg">Completed</span>
                               </>
                            ) : (
                               <>
                                 <div className="text-4xl font-black tabular-nums tracking-tighter">
                                   {sessionData.estimatedTime.split(' ')[0]}
                                 </div>
                                 <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">Minutes</span>
                                 <span className="text-[10px] text-muted-foreground/60 font-medium mt-2 bg-muted px-2 py-0.5 rounded-full">ESTIMATED</span>
                               </>
                            )}
                         </div>
                         {sessionData.status !== 'served' && (
                           <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping opacity-30 duration-1000" />
                         )}
                      </div>
                  </div>
  
                  {/* 2. Timeline Steps */}
                  <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
                      <div className="flex justify-between items-start relative">
                          {/* Connecting Line */}
                          <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted -z-0 mx-4" />
                          
                          {steps.map((step, idx) => {
                               const isCompleted = idx <= currentStepIndex
                               const isCurrent = idx === currentStepIndex
                               return (
                                  <div key={step.id} className="flex flex-col items-center gap-2 relative z-10">
                                      <div className={cn(
                                         "h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                                         isCompleted 
                                           ? "bg-primary border-primary text-primary-foreground shadow-md" 
                                           : "bg-card border-border text-muted-foreground"
                                      )}>
                                          {step.icon}
                                      </div>
                                      <span className={cn(
                                         "text-[10px] font-bold uppercase tracking-wider transition-colors",
                                         isCurrent ? "text-primary" : "text-muted-foreground"
                                      )}>
                                          {step.label}
                                      </span>
                                  </div>
                               )
                          })}
                      </div>
                  </div>
  
                  {/* 3. Order Receipt */}
                  <div className="space-y-3">
                      <h3 className="font-semibold flex items-center gap-2 ml-1">
                          <Receipt className="h-4 w-4 text-primary" />
                          Session Summary
                      </h3>
                      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
                          {/* Receipt Header */}
                          <div className="bg-muted/30 p-4 border-b border-dashed border-border flex justify-between items-center text-xs text-muted-foreground font-medium uppercase tracking-wider">
                             <span>Item</span>
                             <span>Price</span>
                          </div>
                          {/* Receipt Items */}
                          <div className="p-4 space-y-4">
                             {sessionData.items.map((item, idx) => (
                                 <div key={idx} className="flex justify-between items-start gap-4">
                                     <div className="flex gap-3">
                                         <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-[10px] font-bold shrink-0">
                                            {item.quantity}x
                                         </div>
                                         <div className="space-y-1">
                                             <span className="text-sm font-semibold leading-none block">{item.product.name}</span>
                                             {item.notes && (
                                                <p className="text-xs text-muted-foreground italic">Note: {item.notes}</p>
                                             )}
                                         </div>
                                     </div>
                                     <span className="text-sm font-medium tabular-nums">
                                        {formatMoney(item.product.price * item.quantity, currency)}
                                     </span>
                                 </div>
                             ))}
                          </div>
                          {/* Receipt Total */}
                          <div className="bg-muted/30 p-4 border-t border-dashed border-border flex justify-between items-center">
                             <span className="text-sm font-bold">Total Due</span>
                             <span className="text-lg font-bold text-primary">{formatMoney(orderTotal, currency)}</span>
                          </div>
                      </div>
                  </div>
  
              </div>
          </div>
  
          {/* Footer Actions */}
          <div className="p-4 sm:p-6 border-t border-border/50 bg-background/80 backdrop-blur-md sm:rounded-b-[2rem]">
             <Button 
               className="w-full h-14 text-lg font-bold rounded-xl shadow-lg text-white shadow-primary/10" 
               variant={sessionData.status === 'served' ? "default" : "secondary"}
               onClick={onClose}
             >
               {sessionData.status === 'served' ? "Close Tracker" : "Browse Menu"}
             </Button>
          </div>
  
        </DrawerContent>
      </Drawer>
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