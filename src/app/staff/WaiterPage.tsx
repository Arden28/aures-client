"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { 
  Bell, 
  ChefHat, 
  ForkKnife,
  LogOut,
  Sun,
  Moon,
  Clock,
  Wifi,
  WifiOff,
  CheckCircle2,
  ArrowRight,
  Power,
  ChevronLeft,
  Users,
  CreditCard,
  Utensils,
  Receipt,
  Search,
  Filter,
  CalendarDays,
  Map,
  HandPlatter
} from "lucide-react"
import { cn } from "@/lib/utils"

// UI Components
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Integration
import { fetchOrders, updateOrderStatus, type Order, type OrderStatusValue, type PaymentStatusValue } from "@/api/order"
import { subscribeToKitchen, type KDSOrder } from "@/api/kds"
import { updateStaffStatus } from "@/api/staff"
import { toast } from "sonner"
import useAuth from "@/hooks/useAuth"
import { useThemeToggle } from "@/layouts/PosLayout"

// Page Components
import PosTables from "@/app/pos/PosTables"

/* -------------------------------------------------------------------------- */
/* Helpers: Audio & Notifications                                             */
/* -------------------------------------------------------------------------- */

const playSound = (type: 'new' | 'ready') => {
    const file = type === 'new' ? '/sounds/notification.mp3' : '/sounds/notification.mp3'
    // Fallback to KDS sound if specific files don't exist in your public folder
    const audio = new Audio(file)
    audio.volume = 0.7
    audio.play().catch(e => console.log("Audio play failed (interaction needed):", e))
}

const sendNotification = (title: string, body: string) => {
    if (!("Notification" in window)) return
    
    if (Notification.permission === "granted") {
        new Notification(title, { body, icon: "/images/icon.png" }) // Adjust icon path
    }
}

const requestNotificationAccess = () => {
    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission()
    }
}

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type WaiterTask = {
  id: string
  type: "claim" | "pickup" | "payment" | "clear"
  title: string
  subtitle: string
  time: string
  priority: "critical" | "high" | "medium"
  refId: number
  order: Order
}

/* -------------------------------------------------------------------------- */
/* Main Component                                                             */
/* -------------------------------------------------------------------------- */

export default function WaiterPage() {
  const navigate = useNavigate()
  const { user, logout, refresh } = useAuth()
  const { theme, toggleTheme } = useThemeToggle()
  
  // Initialize based on user status
  const [isOnline, setIsOnline] = React.useState((user as any)?.status === 'active')
  const [activeTab, setActiveTab] = React.useState("feed")
  const [tasks, setTasks] = React.useState<WaiterTask[]>([])
  const [isConnected, setIsConnected] = React.useState(false)
  const [statusFilter, setStatusFilter] = React.useState<
        "all" | OrderStatusValue
    >("all")
  
  // Dynamic Stats State
  const [dailyStats, setDailyStats] = React.useState({ completed: 0, sales: 0 })

  // Payment View State
  const [selectedPaymentTask, setSelectedPaymentTask] = React.useState<WaiterTask | null>(null)

  // Safe User Data
  const userName = (user as any)?.name || "Staff"
  const userRole = (user as any)?.role || "Waiter"
  
  // -- Sync isOnline --
  React.useEffect(() => {
    if (user) setIsOnline((user as any).status === 'active')
  }, [user])

  // -- Handlers --
  const handleShiftToggle = async (checked: boolean) => {
    setIsOnline(checked)
    if (checked) requestNotificationAccess()
    
    try {
        const newStatus = checked ? 'active' : 'inactive'
        await updateStaffStatus((user as any)?.id, newStatus)
        toast.success(checked ? "Shift Started" : "Shift Ended", {
            description: checked ? "You are now receiving orders." : "You are now offline."
        })
        if (refresh) refresh()
    } catch (error) {
        setIsOnline(!checked)
        toast.error("Failed to update status")
    }
  }

  // -- Data Fetching --
  const refreshData = React.useCallback(async () => {
    if (!isOnline) return
    try {
        
      const filters: { status?: OrderStatusValue; per_page?: number } = {
          per_page: 100,
      }
      if (statusFilter !== "all") {
          filters.status = statusFilter
      }
        
      const { items } = await fetchOrders(filters)
      const allOrders = items || []

      // Stats
      const completedOrders = allOrders.filter(o => o.status === 'completed')
      const totalSales = completedOrders.reduce((acc, o) => acc + o.total, 0)
      setDailyStats({ completed: completedOrders.length, sales: totalSales })

      // Build Tasks
      const newTasks: WaiterTask[] = []
      
      allOrders.forEach(order => {
        // 1. CLAIM
        if (order.status === 'pending' && !order.waiter) {
             newTasks.push({
                id: `claim-${order.id}`,
                type: 'claim',
                title: `New Order • Table ${order.table?.name || '??'}`,
                subtitle: `${order.items?.length || 0} Items • Waiting for confirmation`,
                time: getTimeDiff(order.opened_at),
                priority: 'critical', 
                refId: order.id,
                order: order
             })
        }
        // 2. PICKUP
        if (order.status === 'ready') {
            newTasks.push({
                id: `ready-${order.id}`,
                type: 'pickup',
                title: `Order Ready • Table ${order.table?.name || '??'}`,
                subtitle: `Ticket #${order.id} • Pickup at Pass`,
                time: getTimeDiff(order.updated_at),
                priority: 'high',
                refId: order.id,
                order: order
            })
        }
        // 3. PAYMENT
        if (order.status === 'served' && order.payment_status === 'unpaid') {
            newTasks.push({
                id: `pay-${order.id}`,
                type: 'payment',
                title: `Payment • Table ${order.table?.name || '??'}`,
                subtitle: `Pending ${formatMoney(order.total)}`,
                time: 'Active',
                priority: 'medium',
                refId: order.id,
                order: order
            })
        }
        // 3. CLEAR TABLE
        if (order.status === 'served' && order.payment_status === 'paid') {
            newTasks.push({
                id: `clear-${order.id}`,
                type: 'clear',
                title: `Ready for cleaning • Table ${order.table?.name || '??'}`,
                subtitle: `This table can be cleared for new guests.`,
                time: 'Active',
                priority: 'medium',
                refId: order.id,
                order: order
            })
        }
      })
      
      setTasks(newTasks.sort((a,b) => {
          const map = { critical: 0, high: 1, medium: 2 }
          return map[a.priority] - map[b.priority]
      }))

    } catch (e) { console.error("Refresh Error:", e) }
  }, [isOnline, statusFilter])

  // -- Realtime Subscription --
  React.useEffect(() => {
    let unsubscribe = () => {}

    if (isOnline) {
      refreshData()

      unsubscribe = subscribeToKitchen(1, {
        onNewOrder: (kdsOrder) => {
            console.log("SOCKET: New Order", kdsOrder)
            // Play Sound & Notify
            playSound('new')
            sendNotification("New Order", `Table ${kdsOrder.table?.name} placed an order.`)
            toast("New Order Received", { icon: <Bell className="h-4 w-4 text-primary" /> })
            
            // Refresh logic (simple approach)
            refreshData()
        },
        onOrderStatusUpdated: (id, status, tableId) => {
            console.log("SOCKET: Status Update", id, status)
            
            if (status === 'ready') {
                playSound('ready')
                sendNotification("Order Ready", `Order #${id} is ready for pickup!`)
                toast("Order Ready for Pickup!", { icon: <ChefHat className="h-4 w-4 text-orange-500" /> })
            }
            
            refreshData()
        },
        onItemStatusUpdated: () => refreshData()
      })
      setIsConnected(true)
    } else {
      setTasks([])
      setIsConnected(false)
    }
    return () => { unsubscribe(); setIsConnected(false) }
  }, [isOnline, refreshData])

  // -- Task Actions --
  const handleTaskAction = async (task: WaiterTask) => {
    //   if (task.type === 'payment') {
    //     setSelectedPaymentTask(task)
    //     return
    //   }

      setTasks(prev => prev.filter(t => t.id !== task.id))
      
      try {
          if (task.type === 'claim') {
              await updateOrderStatus(task.refId, { 
                status: 'preparing',
                waiter_id: (user as any)?.id 
              })
              toast.success(`Sent to Kitchen`, { description: `Table ${task.order.table?.name}` })
          }
          
          if (task.type === 'pickup') {
              await updateOrderStatus(task.refId, { status: 'served' })
              toast.success("Marked as Served")
          }
          
          refreshData()
      } catch (e) { 
          toast.error("Update Failed", { description: "Please try again." })
          refreshData() 
      }
  }

  const handlePaymentComplete = async (task: WaiterTask) => {
      try {
        await updateOrderStatus(task.refId, { status: 'completed' })
        toast.success("Payment Processed", { description: `Order #${task.refId} closed.` })
        setSelectedPaymentTask(null)
        refreshData()
      } catch (e) {
        toast.error("Payment Failed", { description: "Could not close order." })
      }
  }

  const handleLogout = async () => {
      await logout()
      navigate("/login")
  }

  // -- Render --
  if (selectedPaymentTask) {
    return (
      <OrderDetailView 
        order={selectedPaymentTask.order}
        onBack={() => setSelectedPaymentTask(null)}
        actionNode={
            <Button 
                className="w-full h-12 text-base bg-green-600 hover:bg-green-700 text-white shadow-sm"
                onClick={() => handlePaymentComplete(selectedPaymentTask)}
            >
                <CreditCard className="mr-2 h-5 w-5" /> 
                Complete Payment
            </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col h-full w-full bg-muted/20 dark:bg-background transition-colors duration-300 font-sans selection:bg-primary/20">
      
      {/* Header */}
      <header className="flex-none pt-4 pb-3 px-4 sm:px-6 sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/60">
          <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                {/* Responsive Logo */}
                <div className="h-6 shrink-0">
                  <img 
                    src="/images/logo.png" // Placeholder for Tapla logo
                    alt="Tapla Logo" 
                    className="h-full w-full object-contain" 
                  />
                </div>
                {/* Title is hidden on mobile to prioritize the logo/tasks, shown on small screens and up */}
                <h1 className="text-2xl font-semibold tracking-tight text-foreground hidden sm:block">
                  {activeTab === 'feed' ? 'Live Tasks' : activeTab === 'tables' ? 'Floor Plan' : 'Today\'s Orders'}
                </h1>
              </div>
              
              <div className="flex items-center gap-3">
                  <div className={cn(
                      "flex items-center gap-2 p-1 pl-3 pr-1 rounded-full border transition-all duration-300",
                      isOnline ? "bg-primary/10 border-primary/20" : "bg-muted/50 border-border"
                  )}>
                      <span className={cn("text-[10px] font-bold uppercase", isOnline ? "text-primary" : "text-muted-foreground")}>
                          {isOnline ? "Shift On" : "Shift Off"}
                      </span>
                      <Switch 
                        checked={isOnline} 
                        onCheckedChange={setIsOnline} 
                        className="data-[state=checked]:bg-primary scale-90" 
                      />
                  </div>
                  
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Avatar className="h-9 w-9 border border-border cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all">
                              <AvatarImage src="https://github.com/shadcn.png" />
                              <AvatarFallback>{userName.charAt(0)}</AvatarFallback>
                          </Avatar>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 p-2">
                          <DropdownMenuLabel>
                              <div className="flex flex-col">
                                  <span className="text-sm font-medium">{userName}</span>
                                  <span className="text-xs text-muted-foreground capitalize">{userRole}</span>
                              </div>
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={toggleTheme}>
                              {theme === 'light' ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
                              <span>Theme</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                              <LogOut className="mr-2 h-4 w-4" />
                              <span>Log out</span>
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
              </div>
          </div>
          
          {activeTab === 'feed' && isOnline && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar animate-in slide-in-from-top-1 fade-in duration-300">
                  <StatChip label="Pending" value={tasks.length} active />
                  <StatChip label="Completed" value={dailyStats.completed} />
                  <StatChip label="Total Sales" value={formatMoney(dailyStats.sales)} />
              </div>
          )}

          {/* Connection Status moved below the title/logo section */}
          <div className="flex items-center gap-2 mt-1 -mt-2"> {/* Adjusted margin to tighten spacing */}
            <span className="relative flex h-2.5 w-2.5">
              {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>}
              <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", isOnline ? "bg-primary" : "bg-muted-foreground/30")}></span>
            </span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {isOnline ? (isConnected ? "Online" : "Connecting...") : "Offline"}
            </span>
          </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full w-full">
              
              <TabsContent value="feed" className="h-full mt-0 data-[state=inactive]:hidden">
                  {!isOnline ? (
                      <OfflineToggleScreen onStart={() => handleShiftToggle(true)} />
                  ) : (
                      <TaskFeed tasks={tasks} onAction={handleTaskAction} />
                  )}
              </TabsContent>

              <TabsContent value="tables" className="h-full mt-0 data-[state=inactive]:hidden">
                    <div className="h-full pb-20"><PosTables /></div>
              </TabsContent>
              <TabsContent value="orders" className="h-full mt-0 data-[state=inactive]:hidden">
                    <WaiterOrdersSection user={user} />
              </TabsContent>
          </Tabs>
      </main>

      {/* Bottom Dock */}
      {isOnline && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none animate-in slide-in-from-bottom-6 fade-in duration-500">
             <nav className="pointer-events-auto flex items-center gap-1 p-1.5 bg-background/90 backdrop-blur-xl border border-border/50 rounded-full shadow-2xl shadow-primary/5 ring-1 ring-black/5 dark:ring-white/10">
                 <NavBarItem active={activeTab === 'feed'} onClick={() => setActiveTab('feed')} icon={Bell} label="" badge={tasks.length} />
                 <div className="w-px h-5 bg-border mx-1" />
                 <NavBarItem active={activeTab === 'tables'} onClick={() => setActiveTab('tables')} icon={HandPlatter} label="Tables" />
                 <div className="w-px h-5 bg-border mx-1" />
                 <NavBarItem active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon={ForkKnife} label="Orders" />
             </nav>
          </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* WAITER ORDERS SECTION (Filtered by Today & Waiter)                         */
/* -------------------------------------------------------------------------- */

function WaiterOrdersSection({ user }: { user: any }) {
    const [orders, setOrders] = React.useState<Order[]>([])
    const [tab, setTab] = React.useState<"active" | "history">("active")
    const [search, setSearch] = React.useState("")
    const [selectedId, setSelectedId] = React.useState<number | null>(null)
    const [isMobileList, setIsMobileList] = React.useState(true)
    const [statusFilter, setStatusFilter] = React.useState<
        "all" | OrderStatusValue
    >("all")
    

    // Fetch Orders
    const loadOrders = React.useCallback(async () => {
        try {
              const filters: { status?: OrderStatusValue; per_page?: number } = {
                per_page: 100,
              }
              if (statusFilter !== "all") {
                filters.status = statusFilter
              }
        
            const { items } = await fetchOrders(filters)

            setOrders(items || [])
        } catch (e) { console.error(e) }
    }, [statusFilter])

    React.useEffect(() => {
        loadOrders()
        const interval = setInterval(loadOrders, 10000) 
        return () => clearInterval(interval)
    }, [loadOrders])

    const filteredOrders = React.useMemo(() => {
        let list = orders
        if (tab === "active") list = list.filter(o => ["pending", "preparing", "ready", "served"].includes(o.status))
        else list = list.filter(o => ["completed", "cancelled"].includes(o.status))
        
        if (search) {
            const q = search.toLowerCase()
            list = list.filter(o => o.id.toString().includes(q) || o.table?.name.toLowerCase().includes(q))
        }
        return list.sort((a,b) => b.id - a.id)
    }, [orders, tab, search])

    const selectedOrder = React.useMemo(() => orders.find(o => o.id === selectedId), [orders, selectedId])

    const handleSelect = (id: number) => {
        setSelectedId(id)
        setIsMobileList(false)
    }

    return (
        <div className="flex h-full w-full bg-background text-foreground overflow-hidden font-sans">
             {/* LEFT: List */}
             <div className={cn("flex flex-col h-full border-r border-border bg-card transition-all duration-300 z-10 w-full md:w-[400px]", !isMobileList ? "hidden md:flex" : "flex")}>
                <div className="flex-none p-4 border-b border-border space-y-4 bg-card">
                    <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                            <TabsTrigger value="active">Active</TabsTrigger>
                            <TabsTrigger value="history">History</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className="flex items-center justify-center gap-2 py-1 text-xs font-medium text-muted-foreground bg-muted/20 rounded-md">
                        <CalendarDays className="h-3 w-3" />
                        <span>Showing orders for Today</span>
                        {/* <pre>{JSON.stringify(orders, null, 2)}</pre> */}
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search table, ID..." className="pl-9 bg-muted/30 border-input" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>
                <div className="flex-1 overflow-hidden bg-card">
                    <ScrollArea className="h-full">
                        <div className="flex flex-col p-2 gap-2 pb-20">
                            {filteredOrders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2 opacity-50">
                                    <Clock className="h-12 w-12 stroke-[1.5]" />
                                    <p className="text-sm">No orders found for today</p>
                                </div>
                            ) : (
                                filteredOrders.map(order => (
                                    <OrderListItem key={order.id} order={order} active={selectedId === order.id} onClick={() => handleSelect(order.id)} />
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>
             </div>
             {/* RIGHT: Detail View */}
             <div className={cn("flex-1 flex flex-col h-full bg-card md:border-l border-border relative", isMobileList ? "hidden md:flex" : "flex")}>
                {selectedOrder ? (
                    <OrderDetailView order={selectedOrder} onBack={() => setIsMobileList(true)} actionNode={null} />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/5">
                        <div className="h-24 w-24 rounded-full bg-muted/50 border border-border flex items-center justify-center mb-6 shadow-sm">
                            <ArrowRight className="h-10 w-10 opacity-30 text-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">No Order Selected</h3>
                        <p className="max-w-sm text-muted-foreground text-sm">Select an order from today's list to view details.</p>
                    </div>
                )}
             </div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* Shared Views & Helpers                                                     */
/* -------------------------------------------------------------------------- */

// Unified Order Detail View
function OrderDetailView({ order, onBack, actionNode }: { order: Order, onBack: () => void, actionNode?: React.ReactNode }) {
    const tax = (order.subtotal || 0) * 0.10
    const total = order.total

    return (
        <div className="flex flex-col h-full w-full bg-card animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex-none h-16 flex items-center justify-between px-4 border-b border-border bg-card z-20">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2 md:hidden">
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-card-foreground">Order #{order.id}</h2>
                            <StatusBadge status={order.status} />
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {order.table?.name || 'Table'}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {getTimeDiff(order.opened_at)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {order.waiter?.name}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-hidden bg-card relative">
                <ScrollArea className="h-full">
                    <div className="pb-24">
                        <div className="flex flex-col">
                            {order.items?.map((item) => (
                                <div key={item.id} className="flex items-stretch justify-between min-h-[76px] border-b border-border px-4 py-2 relative group">
                                    <div className="flex flex-col justify-center gap-1 flex-1">
                                        <span className="text-sm font-bold leading-snug text-card-foreground">
                                            {item.product?.name || item.name}
                                        </span>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <div className="flex items-center bg-muted/50 rounded-md px-1.5 py-0.5 border border-border">
                                                <span className="font-mono font-bold text-foreground">{item.quantity}</span>
                                            </div>
                                            <span>x</span>
                                            <span>{formatMoney(item.unit_price)}</span>
                                            {item.notes && <span className="text-amber-600 ml-1 italic">({item.notes})</span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end justify-center">
                                        <span className="text-sm font-extrabold tabular-nums text-foreground">
                                            {formatMoney(item.total_price)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </ScrollArea>
            </div>

            {/* Footer */}
            <div className="shrink-0 flex flex-col border-t border-border bg-card pb-[safe]">
                <div className="px-5 py-3 bg-muted/20 border-b border-border space-y-1">
                    <div className="flex justify-between text-xs font-medium text-muted-foreground">
                        <span>Subtotal</span>
                        <span>{formatMoney(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium text-muted-foreground">
                        <span>Tax (10%)</span>
                        <span>{formatMoney(tax)}</span>
                    </div>
                    <div className="flex justify-between items-end mt-2">
                        <span className="text-sm font-bold text-card-foreground">Total Due</span>
                        <span className="text-xl font-extrabold tracking-tight text-primary">{formatMoney(total)}</span>
                    </div>
                </div>
                {actionNode && (
                    <div className="p-4 bg-card border-t border-border">
                        {actionNode}
                    </div>
                )}
            </div>
        </div>
    )
}

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
            <Badge variant="secondary" className="font-mono text-xs text-white px-1.5 py-0.5 h-5">
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
              {order.items?.length || 0} items
            </span>
          </div>
          <span className="font-bold text-lg text-primary tracking-tight">
            {formatMoney(order.total)}
          </span>
        </div>
      </button>
    )
}

function StatusBadge({ status, mini }: { status: string, mini?: boolean }) {
    const styles = {
      pending: "bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300 border-slate-200 dark:border-slate-700",
      preparing: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      ready: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      served: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
      completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      cancelled: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
    }[status.toLowerCase()] || "bg-muted text-muted-foreground border-border"
  
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

function OfflineToggleScreen({ onStart }: { onStart: () => void }) {
    return (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-background/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                <div className="relative h-24 w-24 bg-card rounded-3xl shadow-xl border border-border flex items-center justify-center rotate-3 transition-transform hover:rotate-0">
                    <WifiOff className="h-10 w-10 text-muted-foreground" />
                </div>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-foreground">You are Offline</h2>
            <p className="text-muted-foreground text-center max-w-[260px] mt-2 mb-10 leading-relaxed">
                Sync with the kitchen and start receiving your tickets.
            </p>

            <div className="flex items-center gap-4 bg-card p-2 pr-6 pl-2 rounded-full border border-border shadow-lg hover:shadow-xl transition-all cursor-pointer group" onClick={onStart}>
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Power className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Swipe to</span>
                    <span className="text-sm font-bold text-foreground">Start Shift</span>
                </div>
                <Switch 
                    checked={false} 
                    onCheckedChange={(c) => c && onStart()} 
                    className="ml-2 data-[state=checked]:bg-primary" 
                />
            </div>
        </div>
    )
}

function TaskFeed({ tasks, onAction }: { tasks: WaiterTask[], onAction: (t: WaiterTask) => void }) {
    if (tasks.length === 0) return (
        <div className="h-full flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95">
             <div className="h-20 w-20 bg-primary/5 rounded-full flex items-center justify-center mb-4 ring-1 ring-primary/10">
                <CheckCircle2 className="h-9 w-9 text-primary/60" />
             </div>
             <h3 className="text-lg font-semibold text-foreground">All Clear</h3>
             <p className="text-muted-foreground text-sm mt-1">No active tickets.</p>
        </div>
    )

    return (
        <ScrollArea className="h-full bg-muted/10">
            <div className="px-4 py-4 space-y-4 pb-32">
                <div className="flex items-center justify-between px-1">
                     <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Incoming Tickets</span>
                     <Badge variant="secondary" className="bg-background border border-border">{tasks.length}</Badge>
                </div>
                {tasks.map((task, i) => (
                    <TicketCard key={task.id} task={task} onAction={onAction} index={i} />
                ))}
            </div>
        </ScrollArea>
    )
}

function TicketCard({ task, onAction, index }: { task: WaiterTask, onAction: (t: WaiterTask) => void, index: number }) {
    const isCritical = task.priority === 'critical' // Claim / New
    
    // Summary logic
    const itemsSummary = task.order.items?.map(i => `${i.quantity}x ${i.product?.name}`).join(', ') || "Items loading..."

    return (
        <div 
            className="group relative flex flex-col bg-card border border-border shadow-sm rounded-xl overflow-hidden active:scale-[0.99] transition-all duration-200"
            style={{ animation: `slideUp 0.3s ease-out ${index * 0.05}s backwards` }}
        >
            {/* Left Brand Strip */}
            <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 z-10", 
                isCritical ? "bg-primary" : 
                task.type === 'pickup' ? "bg-orange-500" : "bg-emerald-500"
            )} />

            {/* Ticket Header */}
            <div className="flex justify-between items-start p-4 pb-2 pl-5">
                <div className="flex items-center gap-3">
                    <div className={cn("h-11 w-11 rounded-lg flex items-center justify-center font-bold text-lg border bg-muted/20",
                        isCritical ? "text-primary border-primary/20 bg-primary/5" : "text-foreground border-border"
                    )}>
                        {task.order.table?.id || '#'}
                    </div>
                    <div>
                        <h4 className="font-bold text-[15px] leading-tight text-foreground">{task.title}</h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-mono">
                            <span className="bg-muted px-1.5 rounded-sm">#{task.refId}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {task.time}</span>
                        </div>
                    </div>
                </div>
                {isCritical && (
                    <span className="flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                    </span>
                )}
            </div>

            {/* Jagged Line Separator */}
            <div className="relative my-2 pl-1.5">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 rounded-full bg-muted/10 border-r border-border z-20" />
                <div className="border-t-2 border-dashed border-border/60 w-full" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 rounded-full bg-muted/10 border-l border-border z-20" />
            </div>

            {/* Ticket Body */}
            <div className="px-4 pb-4 pl-5">
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {itemsSummary}
                </p>
                {task.order.items && task.order.items.length > 2 && (
                    <span className="text-[10px] font-medium text-primary mt-1 block">
                        + {task.order.items.length - 2} more items...
                    </span>
                )}
            </div>

            {/* Action Footer */}
            <div className={`px-4 pb-4 pt-0 pl-5 ${task.type === 'payment' ? 'hidden' : ''} `}>
                <Button 
                    onClick={() => onAction(task)} 
                    className={cn("w-full font-semibold text-white shadow-sm h-11 rounded-lg text-sm", 
                        isCritical ? "bg-primary text-primary-foreground hover:bg-primary/90" : 
                        "bg-secondary text-white hover:bg-secondary/80 border border-border"
                    )}
                >
                    {task.type === 'claim' && "Claim Order"}
                    {task.type === 'pickup' && "Confirm Served"}
                    {task.type === 'payment' && "Mark as Paid"}
                    <ArrowRight className="ml-auto h-4 w-4 opacity-50" />
                </Button>
            </div>
        </div>
    )
}

function NavBarItem({ active, onClick, icon: Icon, badge, label }: any) {
    return (
        <button onClick={onClick} className={cn(
            "relative px-5 py-2.5 rounded-full transition-all duration-300 flex items-center gap-2 group",
            active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}>
            <Icon className={cn("h-5 w-5", active && "fill-current")} strokeWidth={active ? 2.5 : 2} />
            {active && <span className="text-xs font-bold animate-in fade-in slide-in-from-left-2 duration-200">{label}</span>}
            
            {badge > 0 && (
                <span className="absolute top-2 right-3 h-2 w-2 bg-destructive rounded-full ring-2 ring-background animate-pulse" />
            )}
        </button>
    )
}

function StatChip({ label, value, active }: any) {
    return (
        <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap",
            active 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-background border-border text-muted-foreground"
        )}>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</span>
            <span className="text-sm font-bold">{value}</span>
        </div>
    )
}

function getTimeDiff(dateStr: string | null) {
  if(!dateStr) return "Just now"
  const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 60000)
  return diff < 1 ? "Just now" : `${diff}m ago`
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatTime(dateString: string) {
  if (!dateString) return "--"
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit'
  })
}