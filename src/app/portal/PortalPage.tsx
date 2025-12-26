"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { 
  ShoppingBag, Minus, Plus, ChevronRight, ChevronLeft, Search, 
  Flame, CheckCircle2, X, ChefHat, Utensils, BellRing, Receipt,
  RotateCcw, CreditCard, Clock,
  Check,
  LogOut, Users, ShieldAlert
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
  closePortalSession,
  subscribeToSessionOrders,
  type PortalCategory, 
  type PortalProduct, 
  type PortalCartItem,
  type TableSession,
  type ActiveSessionData,
  type OrderStatus,
  type OrderItemStatus,
  type OrderSummary,
  subscribeToSessionStatus
} from "@/api/portal"
import { useSearchParams } from "react-router-dom"
import { getDeviceId } from "@/utils/device"
import PortalSkeleton from "@/components/portal/PortalSkeleton"
import OrderTrackerCard from "@/components/portal/OrderTrackerCard"
import LiveOrderTracker from "@/components/portal/LiveOrderTracker"
import ProductDetailDrawer from "@/components/portal/ProductDetailDrawer"
import CartDrawer from "@/components/portal/CartDrawer"
import DeviceBlockedScreen from "@/components/portal/DeviceLockedScreen"
import ProductSection from "@/components/portal/ProductSection"

/* -------------------------------------------------------------------------- */
/* Main Component                                                             */
/* -------------------------------------------------------------------------- */

export default function PortalPage() {
  const [searchParams] = useSearchParams()
  const tableCode = searchParams.get("table")

  // -- State
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Device Blocking State
  const [isDeviceBlocked, setIsDeviceBlocked] = React.useState(false)
  const [lockedInfo, setLockedInfo] = React.useState<{
      restaurant: string, 
      table: string,
      currency: string,
      categories: PortalCategory[],
      products: PortalProduct[]
  } | null>(null)

  const [session, setSession] = React.useState<TableSession | null>(null)
  const [categories, setCategories] = React.useState<PortalCategory[]>([])
  const [products, setProducts] = React.useState<PortalProduct[]>([])
  const [activeCategory, setActiveCategory] = React.useState("popular")
  
  // Cart State (Unified View: History + New Items)
  const [cart, setCart] = React.useState<PortalCartItem[]>([])
  const [isCartOpen, setIsCartOpen] = React.useState(false)
  const [isOrdering, setIsOrdering] = React.useState(false)
  
  // Active Session State
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
  
  // Logic to lock items that are already processing
  // These items cannot be edited/removed from the cart
  const isLocked = (status?: string) => {
      return status && ['preparing', 'cooking', 'ready', 'served', 'completed'].includes(status);
  };

  // Logic: Can only modify if session is NOT closed
  const canModifyOrder = session?.session_status !== 'closed';
  
  // Check if paid (session closed)
  const isOrderPaid = session?.session_status === 'closed';

  // -- Init
  React.useEffect(() => {
    async function load() {
      if (!tableCode) {
        setError("No table code provided. Please scan the QR code again.")
        setIsLoading(false)
        return
      }

      // 1. Get Device ID
      const deviceId = getDeviceId();

      try {
        // 2. Pass deviceId to the API
        const data = await fetchPortalData(tableCode, deviceId)
        
        setSession(data.session)
        setCategories(data.menu.categories)
        setProducts(data.menu.products)
        
        const sessionPayload = data.active_session || data.active_order;
        if (sessionPayload) { 
            setActiveSessionData(sessionPayload)
            setCart(sessionPayload.items)
        }

      } catch (e: any) {
        // console.error(e)
        
        // 3. Handle the Blocking Logic
        if (e.status === 403 && e.payload?.code === 'DEVICE_LOCKED') {
           setIsDeviceBlocked(true)
           setLockedInfo({
               restaurant: e.payload.restaurant_name,
               table: e.payload.table_name,
               currency: e.payload.currency || "USD",
               categories: e.payload.menu?.categories || [], // <--- IMPORTANT
               products: e.payload.menu?.products || []
           })
           // We do NOT set generic error, so the specific UI below renders instead
        } else {
           setError("Invalid or expired table code.")
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [tableCode])

  // -- Real-time Sub (Multi-Order)
  React.useEffect(() => {
    // We access the orders array from the session data
    const orders = (activeSessionData as any)?.orders || [];

    if (orders.length > 0 && session?.session_status !== 'closed') {
      
      const orderIds = orders.map((o: any) => o.id);
      
      const unsubscribe = subscribeToSessionOrders(orderIds, {
        onOrderStatus: (orderId, newStatus) => {
            // 1. Update the specific order in the session data
            setActiveSessionData(prev => {
                if (!prev) return null;
                const prevOrders = (prev as any).orders || [];
                const updatedOrders = prevOrders.map((o: any) => o.id === orderId ? { ...o, status: newStatus } : o);
                return { ...prev, orders: updatedOrders } as ActiveSessionData;
            })
            if (newStatus === 'served') {
                toast.success(`Order #${orderId} has been served!`)
            }
        },
        onItemStatus: (itemId, newStatus) => {
            // 2. Update Cart View (so locks appear/disappear)
            setCart(prev => prev.map(item => item.order_item_id === itemId ? { ...item, status: newStatus } : item))
            
            // 3. Update Session Data Deeply
            setActiveSessionData(prev => {
                if (!prev) return null;
                // Update flattened items list
                const updatedItems = prev.items.map(item => item.order_item_id === itemId ? { ...item, status: newStatus } : item);
                
                // Update nested orders list
                const prevOrders = (prev as any).orders || [];
                const updatedOrders = prevOrders.map((o: any) => ({
                    ...o,
                    items: o.items.map((i: any) => i.order_item_id === itemId ? { ...i, status: newStatus } : i)
                }));

                return { ...prev, items: updatedItems, orders: updatedOrders } as ActiveSessionData;
            })
        }
      })
      return () => unsubscribe()
    }
  }, [activeSessionData?.session_id, (activeSessionData as any)?.orders?.length, session?.session_status])

  // -- Real-time Sub (Session Status) --
    React.useEffect(() => {
      if (!session?.active_session_id || session.session_status === 'closed') return;

      const unsubscribe = subscribeToSessionStatus(session.active_session_id, () => {
          // 1. Toast Notification
          toast.success("Session Completed", {
              description: "Your tab has been closed. Thank you for visiting!",
              duration: 5000,
          });

          // 2. Update Session State to Closed
          setSession(prev => prev ? { ...prev, session_status: 'closed' } : null);

          // 3. Update Active Session Data (stop the tracker pulse)
          setActiveSessionData(prev => {
              // If we want to keep the data visible but mark it paid:
              if(prev) return { ...prev, total_due: 0 }; 
              return null;
          });
          
          // 4. Close Modals
          setIsCartOpen(false);
          // We optionally keep tracker open or close it:
          // setIsTrackerOpen(false); 
      });

      return () => unsubscribe();
    }, [session?.active_session_id, session?.session_status]);

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

  const handleProductClick = (product: PortalProduct) => {
    if (canModifyOrder) {
        setTempQty(1); 
        setTempNotes(""); 
        setSelectedProduct(product)
    } else {
        toast.info("Cannot add items. Session is closed.")
    }
  }

  const handleAddToCart = () => {
    if (!selectedProduct) return
    
    // Guard
    if (!canModifyOrder) {
        toast.error("This session is closed. Please ask for the bill or start a new table.")
        return
    }

    setCart(prev => {
      // Find matching item only if it's pending. Different notes = different item.
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
        toast.error("Cannot remove items that are being prepared or served.")
        return 
      }
      
      setCart(prev => prev.filter((_, i) => i !== itemIndex))
  }

  const handleDecrement = (itemIndex: number) => {
      const item = cart[itemIndex]
      
      if (isLocked(item.status)) {
           toast.error("Item is already preparing/served.")
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
         toast.error("This item is processing. Add a new one instead.")
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

    const deviceId = getDeviceId();

    try {
      // 1. Submit the cart.
      const result: ActiveSessionData = await placePortalOrder(
          tableCode, 
          session.active_session_id, 
          deviceId,
          cart
      )
      
      // 2. Success updates
      setActiveSessionData(result)
      setCart(result.items)
      
      if (!session.active_session_id) {
          setSession(prev => prev ? { ...prev, active_session_id: result.session_id } : null)
      }

      toast.success(session.active_session_id ? "Order updated successfully!" : "Order placed successfully!")
      
      setIsCartOpen(false)
      setIsTrackerOpen(true)

    } catch (e: any) {
      console.error(e)

      // --- NEW: Handle Device Lock Specifically ---
      if (e.response?.status === 403 && e.response?.data?.code === 'DEVICE_LOCKED') {
        // Option A: Specific Toast
        toast.error("This table is currently active on another device.");
        
        // Option B: kick them out or show a modal
        // setIsLockedModalOpen(true); 
      } else {
        // Fallback for other errors
        toast.error(e.response?.data?.message || "Failed to submit order.")
      }

    } finally {
      setIsOrdering(false)
    }
  }

  const handlePayment = async () => {
      if (!session?.active_session_id || !tableCode) return;
      
      const confirmPayment = window.confirm(`Finalize session and pay ${formatMoney(activeSessionData?.total_due || 0, currency)}?`);
      if(!confirmPayment) return;

      try {
          await closePortalSession(tableCode, session.active_session_id)
          setSession(prev => prev ? { ...prev, session_status: 'closed' } : null)
          toast.success("Payment successful! Session closed.")
      } catch (e) {
          toast.error("Payment failed. Please try again.")
      }
  }

  // Helper to reset the frontend state for a fresh start
  const resetLocalState = () => {
      setActiveSessionData(null)
      setCart([])
      // Clear active session ID so the next order submission creates a FRESH session
      setSession(prev => prev ? { 
          ...prev, 
          active_session_id: null, 
          session_status: 'active' // Reset status so UI unlocks
      } : null)
  }

  // Handle New Order (Resets for a fresh session)
  const handleNewOrder = async () => {
      if (session?.active_session_id && tableCode && session.session_status !== 'closed') {
         if(window.confirm("Close current session and start fresh?")) {
             try {
                 await closePortalSession(tableCode, session.active_session_id)
                 resetLocalState()
                 toast.success("Session closed. Ready for new order!")
             } catch(e) {
                 toast.error("Failed to close session.")
             }
         }
      } else {
          // If session is already closed or didn't exist, just reset local state
          resetLocalState()
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

  // Blocked Screen
  if (isDeviceBlocked) {
      return (
      <DeviceBlockedScreen 
      tableName={lockedInfo?.table} 
      restaurantName={lockedInfo?.restaurant} // Make sure to set this in the error handler
      categories={lockedInfo?.categories}
      products={lockedInfo?.products}
      currency={lockedInfo?.currency} 
      />)
  }


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
                {activeSessionData.status === 'served' ? "Service Complete" : "Tab Active"}
            </div>
        )}
      </div>

      {/* 2. Product Section */}
      <ProductSection 
        restaurantName={session?.restaurant_name}
        categories={categories}
        products={products}
        currency={currency}
        canModifyOrder={canModifyOrder}
        onProductClick={handleProductClick}
      />

      {/* 5. Active Session Tracker Pill */}
      <AnimatePresence>
        {activeSessionData && !isTrackerOpen && !isOrderPaid && (
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

        {/* Scenario B: Served & Unpaid -> Show Pay Button */}
        {!canModifyOrder && !isOrderPaid && !isTrackerOpen && activeSessionData && (
           <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-6 left-0 right-0 z-50 px-4 pointer-events-none">
             <div className="max-w-md mx-auto pointer-events-auto">
               <Button size="lg" onClick={handlePayment} className="w-full h-16 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl hover:scale-[1.02] transition-all flex items-center justify-between px-6 border-2 border-white/10">
                 <div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20"><CreditCard className="h-5 w-5"/></div><div className="flex flex-col items-start text-xs"><span className="font-bold text-base">Pay Bill</span><span className="opacity-90 font-normal">Secure Checkout</span></div></div>
                 <span className="font-bold text-xl">{formatMoney(activeSessionData.total_due, currency)}</span>
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
        
        {/* Scenario D: Close Session / Leave Table */}
        {/* Shows on Bottom Left - Mirrors the Track Order button */}
        {activeSessionData && !isOrderPaid && !isTrackerOpen && activeSessionData.total_due <= 0 && (
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className={cn(
                "fixed left-4 sm:left-6 z-40 transition-all duration-500 ease-in-out",
                // Dynamic Vertical Position: Move up if the main Cart button is visible
                cartCount > 0 ? "bottom-24" : "bottom-6"
            )}
          >
              <Button 
                onClick={async () => {
                    if(!window.confirm("Are you sure you want to leave this table?")) return;
                    try {
                        await closePortalSession(tableCode!, session!.active_session_id!)
                        setSession(prev => prev ? { ...prev, session_status: 'closed' } : null)
                        toast.success("Session closed. Hope to see you again!")
                    } catch(e: any) {
                        toast.error(e.response?.data?.message || "Could not close session.")
                    }
                }}
                className="h-14 w-14 sm:w-auto sm:px-6 rounded-full bg-background/80 backdrop-blur-md border border-border/50 shadow-md hover:bg-destructive/5 hover:border-destructive/30 hover:text-destructive hover:scale-105 text-muted-foreground transition-all flex items-center justify-center gap-2.5 group"
              >
                <div className="relative">
                    <LogOut className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform duration-300" />
                </div>
                <span className="hidden sm:inline font-bold text-sm tracking-wide">Leave Table</span>
              </Button>
          </motion.div>
        )}

      </AnimatePresence>

      {/* 7. Product Detail Drawer */}
      <ProductDetailDrawer 
        product={selectedProduct}
        currency={currency}
        quantity={tempQty}
        setQuantity={setTempQty}
        notes={tempNotes}
        setNotes={setTempNotes}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />

      {/* 8. Cart Drawer (Only reachable if canModifyOrder is true) */}
      <CartDrawer 
        isOpen={isCartOpen}
        onOpenChange={setIsCartOpen}
        cart={cart}
        activeSessionData={activeSessionData}
        currency={currency}
        cartTotal={cartTotal}
        isOrdering={isOrdering}
        onIncrement={handleIncrement}
        onDecrement={handleDecrement}
        onSubmit={handleOrderSubmission}
        isLocked={(status) => isLocked(status)}
      />

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




