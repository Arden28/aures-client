// src/app/pos/PosOrders.tsx
"use client"

import * as React from "react"
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  Clock, 
  Users, 
  CreditCard, 
  ChefHat, 
  Trash2, 
  Printer,
  ArrowRight,
  Hash, 
  Percent, 
  DollarSign,
  Delete as DeleteIcon,
  MoreVertical,
  Ban,
  RotateCcw,
  Bell,
  Utensils
} from "lucide-react"

import { cn, formatMoney } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

// API
import { 
  fetchOrders, 
  updateOrderStatus, 
  type Order, 
  type OrderStatusValue 
} from "@/api/order"
import type { Product } from "@/api/product"
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
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function PosOrders() {
  // -- Order Data State
  const [orders, setOrders] = React.useState<Order[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  
  // -- Filters
  const [activeTab, setActiveTab] = React.useState<"active" | "history">("active")
  const [searchQuery, setSearchQuery] = React.useState("")
  
  // -- Selection & Mobile
  const [selectedOrderId, setSelectedOrderId] = React.useState<number | null>(null)
  const [showListOnMobile, setShowListOnMobile] = React.useState(true)

  // -- Cart / Calculator State
  const [cart, setCart] = React.useState<CartItem[]>([])
  const [selectedItemUuid, setSelectedItemUuid] = React.useState<string | null>(null)
  const [calcMode, setCalcMode] = React.useState<CalcMode>("qty")
  const [overwriteNext, setOverwriteNext] = React.useState(true)

  // --------------------------------------------------------------------------
  // 1. Load Orders
  // --------------------------------------------------------------------------
  const loadOrders = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetchOrders() 
      setOrders(res.items)
    } catch (error) {
      toast.error("Failed to fetch orders")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // --------------------------------------------------------------------------
  // 2. Sync Selected Order -> Local Cart State
  // --------------------------------------------------------------------------
  const selectedOrder = React.useMemo(
    () => orders.find(o => o.id === selectedOrderId) || null, 
    [orders, selectedOrderId]
  )

  const isEditable = selectedOrder?.status === "pending"

  React.useEffect(() => {
    if (selectedOrder && selectedOrder.items) {
      const mappedCart: CartItem[] = selectedOrder.items.map(item => ({
        uuid: item.id.toString(), 
        product: item.product as Product, 
        quantity: item.quantity,
        discountPercent: 0,
        customPrice: item.unit_price 
      }))
      setCart(mappedCart)
      setSelectedItemUuid(null) 
    } else {
      setCart([])
    }
  }, [selectedOrder])

  // --------------------------------------------------------------------------
  // 3. Filter Logic
  // --------------------------------------------------------------------------
  const filteredOrders = React.useMemo(() => {
    let filtered = orders
    if (activeTab === "active") {
      filtered = filtered.filter(o => !["completed", "cancelled"].includes(o.status))
    } else {
      filtered = filtered.filter(o => ["completed", "cancelled"].includes(o.status))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(o => 
        o.id.toString().includes(q) || 
        o.table?.name.toLowerCase().includes(q) ||
        o.total.toString().includes(q)
      )
    }
    return filtered.sort((a, b) => b.id - a.id)
  }, [orders, activeTab, searchQuery])

  // --------------------------------------------------------------------------
  // 4. Calculator Engine
  // --------------------------------------------------------------------------
  const handleCalcNum = (numStr: string) => {
    if (!selectedItemUuid || !isEditable) return
    
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
    if (!selectedItemUuid || !isEditable) return
    setCart(prev => prev.map(item => {
      if (item.uuid !== selectedItemUuid) return item
      if (overwriteNext) return applyValue(item, calcMode, 0)
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
  // 5. Totals Calculation
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

  // --------------------------------------------------------------------------
  // 6. Actions
  // --------------------------------------------------------------------------
  const handleOrderSelect = (id: number) => {
    setSelectedOrderId(id)
    setShowListOnMobile(false)
  }

  const handleStatusUpdate = async (newStatus: OrderStatusValue) => {
    if (!selectedOrderId) return
    try {
      await updateOrderStatus(selectedOrderId, { status: newStatus })
      toast.success(`Order updated`)
      loadOrders()
    } catch (error) {
      toast.error("Failed to update")
    }
  }

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans">
      
      {/* ================= LEFT COLUMN: ORDER LIST ================= */}
      <div className={cn(
        "flex flex-col h-full border-r border-border bg-card transition-all duration-300 z-10",
        // Widened column for better visibility
        "w-full md:w-[400px] lg:w-[450px]", 
        !showListOnMobile ? "hidden md:flex" : "flex"
      )}>
        
        {/* Header & Search */}
        <div className="flex-none p-4 border-b border-border space-y-4 bg-card">

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger value="active" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Active</TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-background data-[state=active]:text-foreground">History</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search table, ID, amount..." 
              className="pl-9 bg-muted/30 border-input placeholder:text-muted-foreground"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* List - Auto Scroll */}
        <div className="flex-1 overflow-hidden bg-card">
          <ScrollArea className="h-full">
            <div className="flex flex-col p-2 gap-2 pb-20">
              {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2 opacity-50">
                  <Clock className="h-12 w-12 stroke-[1.5]" />
                  <p className="text-sm">No orders found</p>
                </div>
              ) : (
                filteredOrders.map(order => (
                  <OrderListItem 
                    key={order.id} 
                    order={order} 
                    active={selectedOrderId === order.id} 
                    onClick={() => handleOrderSelect(order.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>


      {/* ================= RIGHT COLUMN: CART & ACTIONS ================= */}
      <div className={cn(
        "flex-1 flex flex-col h-full bg-card md:border-l border-border relative",
        // Mobile logic
        showListOnMobile ? "hidden md:flex" : "flex"
      )}>
        
        {selectedOrder ? (
          <>
            {/* 1. Cart Header */}
            <div className="flex-none h-16 flex items-center justify-between px-4 border-b border-border bg-card z-20">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" size="icon" 
                  className="md:hidden -ml-2"
                  onClick={() => setShowListOnMobile(true)}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-card-foreground">Order #{selectedOrder.id}</h2>
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> 4 Guests</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime(selectedOrder.opened_at || "")}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="hidden sm:flex gap-2 border-border text-muted-foreground hover:text-foreground">
                  <Printer className="h-4 w-4" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem>Add Note</DropdownMenuItem>
                    <DropdownMenuItem>Split Bill</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Ban className="mr-2 h-4 w-4" /> Void Order
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <RotateCcw className="mr-2 h-4 w-4" /> Refund
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* 2. Cart Items (Editable if pending) */}
            <div className="flex-1 overflow-hidden bg-card relative">
              <ScrollArea className="h-full">
                <div className="pb-24 md:pb-0">
                  <div className="flex flex-col">
                    {cart.map((item) => (
                      <CartRow 
                        key={item.uuid} 
                        item={item} 
                        // Only allow selection if editable
                        selected={selectedItemUuid === item.uuid}
                        onClick={() => isEditable && setSelectedItemUuid(item.uuid)}
                        onRemove={() => {
                            toast.info("Remove item logic")
                        }}
                        isEditable={isEditable}
                      />
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* 3. Bottom Section (Totals + Calculator/Actions) */}
            <div className="shrink-0 flex flex-col border-t border-border bg-card pb-[safe] md:pb-0">
                
                {/* Totals Strip */}
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

                {/* CONDITIONAL: Show Calculator OR Actions */}
                {isEditable ? (
                    /* --- CALCULATOR MODE (Pending) --- */
                    <div className="grid grid-cols-4 h-[240px] bg-border gap-px border-b border-border select-none animate-in slide-in-from-bottom-10 duration-200">
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
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg flex flex-col items-center justify-center gap-1 transition-colors active:scale-[0.98]"
                          onClick={() => handleStatusUpdate('preparing')}
                       >
                          <ChefHat className="h-5 w-5" />
                          <span className="text-[10px] uppercase font-bold">Send to Kitchen</span>
                       </button>
                    </div>
                ) : (
                    /* --- ACTION MODE (Locked) --- */
                    <div className="p-4 bg-card grid grid-cols-2 gap-4 h-[140px] items-center border-t border-border">
                        {selectedOrder.status === 'preparing' && (
                             <Button 
                                className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 text-white col-span-2 shadow-sm"
                                onClick={() => handleStatusUpdate('ready')}
                             >
                                <Bell className="mr-2 h-5 w-5" /> Mark Ready
                             </Button>
                        )}
                        {selectedOrder.status === 'ready' && (
                             <Button 
                                className="w-full h-12 text-base bg-primary text-primary-foreground hover:bg-primary/90 col-span-2 shadow-sm"
                                onClick={() => handleStatusUpdate('served')}
                             >
                                <Utensils className="mr-2 h-5 w-5" /> Mark Served
                             </Button>
                        )}
                        {selectedOrder.status === 'served' && (
                             <Button 
                                className="w-full h-12 text-base bg-green-600 hover:bg-green-700 text-white col-span-2 shadow-sm"
                                onClick={() => handleStatusUpdate('completed')}
                             >
                                <CreditCard className="mr-2 h-5 w-5" /> Complete Payment
                             </Button>
                        )}
                        
                        {/* Default Actions for non-completed */}
                        {!['completed', 'cancelled'].includes(selectedOrder.status) && (
                            <>
                                <Button variant="secondary" className="h-12 border border-border">Print Bill</Button>
                                <Button variant="outline" className="h-12 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => handleStatusUpdate("cancelled")}>Cancel</Button>
                            </>
                        )}
                    </div>
                )}
            </div>
          </>
        ) : (
          // Empty State (No Selection)
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/5">
            <div className="h-24 w-24 rounded-full bg-muted/50 border border-border flex items-center justify-center mb-6 shadow-sm">
              <ArrowRight className="h-10 w-10 opacity-30 text-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Order Selected</h3>
            <p className="max-w-sm text-muted-foreground text-sm">
              Select an order to view details. Pending orders can be edited using the calculator.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Sub Components                                                             */
/* -------------------------------------------------------------------------- */

function OrderListItem({ order, active, onClick }: { order: Order, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex flex-col gap-2 p-4 rounded-xl border text-left transition-all group relative overflow-hidden",
        active 
          ? "bg-accent/50 border-primary/50 shadow-sm" 
          : "bg-card border-border hover:border-primary/30 hover:bg-muted/20"
      )}
    >
      {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
      
      <div className="flex justify-between items-start w-full">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs px-1.5 py-0.5 h-5">
            #{order.id}
          </Badge>
          <span className="font-semibold text-foreground truncate max-w-[120px]">
            {order.table?.name || "Takeout"}
          </span>
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {formatTime(order.opened_at || "")}
        </span>
      </div>

      <div className="flex justify-between items-end w-full">
        <div className="flex flex-col gap-1">
          <StatusBadge status={order.status} mini />
          <span className="text-xs text-muted-foreground">
            {order.items?.length || 0} items • {order.waiter?.name || "Staff"}
          </span>
        </div>
        <span className="font-bold text-lg text-primary tracking-tight">
          {formatMoney(order.total)}
        </span>
      </div>
    </button>
  )
}

// CartRow Component
function CartRow({ item, selected, onClick, onRemove, isEditable }: { item: CartItem, selected: boolean, onClick: () => void, onRemove: () => void, isEditable: boolean }) {
    const unitPrice = item.customPrice ?? item.product.price
    const total = unitPrice * item.quantity * (1 - item.discountPercent/100)

    return (
        <div 
            onClick={onClick}
            className={cn(
                "flex items-stretch justify-between min-h-[76px] border-b border-border select-none relative group pl-4 pr-3 transition-colors",
                selected ? "bg-accent/50" : "bg-card",
                isEditable ? "cursor-pointer hover:bg-muted/20" : "cursor-default opacity-90"
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
                {selected && isEditable && (
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

function StatusBadge({ status, mini }: { status: string, mini?: boolean }) {
  const styles = {
    pending: "bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    PREPARING: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    ready: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    served: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    cancelled: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
  }[status] || "bg-muted text-muted-foreground border-border"

  const label = status.replace("_", " ")

  if (mini) {
    return (
      <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md border inline-flex w-fit", styles)}>
        {label}
      </span>
    )
  }

  return (
    <Badge variant="outline" className={cn("capitalize border shadow-none", styles)}>
      {label}
    </Badge>
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


function formatTime(dateString: string) {
  if (!dateString) return "--"
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit'
  })
}