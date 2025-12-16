"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { 
  Bell, 
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
  Search, 
  CalendarDays,
  Banknote,
  Wallet,
  Receipt,
  Utensils
} from "lucide-react"
import { cn, formatMoney, getTimeDiff } from "@/lib/utils"

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
import { fetchOrders, updateOrderStatus, type Order, type OrderStatusValue } from "@/api/order"
import { subscribeToKitchen } from "@/api/kds"
import { toast } from "sonner"
import useAuth from "@/hooks/useAuth"
import { useThemeToggle } from "@/layouts/PosLayout"

// Page Components
import { updateStaffStatus } from "@/api/staff"
import { createTransaction, fetchTransactions, type TransactionPayload } from "@/api/transaction"

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type CashierTask = {
  id: string
  title: string
  subtitle: string
  time: string
  amount: number
  priority: "high" | "medium"
//   refId: number
  // order: Order
  // Changed: We now hold an array of orders for this session
  orders: Order[]
}

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
/* Main Component                                                             */
/* -------------------------------------------------------------------------- */

export default function CashierPage() {
  const navigate = useNavigate()
  const { user, logout, refresh } = useAuth()
  const { theme, toggleTheme } = useThemeToggle()
  
  const [isOnline, setIsOnline] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("feed")
  const [tasks, setTasks] = React.useState<CashierTask[]>([])
  const [isConnected, setIsConnected] = React.useState(false)
  const [statusFilter, setStatusFilter] = React.useState<
          "all" | OrderStatusValue
      >("all")
  
  // Dynamic Stats State
  const [dailyStats, setDailyStats] = React.useState({ toCollect: 0, collected: 0, count: 0 })

  // Payment View State (Task Overlay)
  const [selectedPaymentTask, setSelectedPaymentTask] = React.useState<CashierTask | null>(null)

  // Safe User Data
  const userName = (user as any)?.name || "Staff"
  const userRole = (user as any)?.role || "Cashier"
    
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
  
// 1. Logic to Group Orders by Session or Table
const refreshData = React.useCallback(async () => {
    if (!isOnline) return
    try {
        const filters: { status?: OrderStatusValue; per_page?: number } = { per_page: 100 }
        if (statusFilter !== "all") filters.status = statusFilter
        
        
        // Parallel Fetch: Get Orders (for To Collect) AND Transactions (for Collected)
        const [ordersRes, transactions] = await Promise.all([
            fetchOrders(filters),
            fetchTransactions({ per_page: 100 }) // Fetch today's transactions
        ])
        
        const allOrders = ordersRes.items || []

        // Stats Calculation (Same as before)
        const completedOrders = allOrders.filter(o => o.status === 'completed')
        const unpaidOrders = allOrders.filter(o => o.status !== 'cancelled' && o.status !== 'completed' && o.payment_status === 'unpaid')

        // Collected: Sum of TODAY'S TRANSACTIONS (Actual money in drawer)
        // This is now accurate per the controller logic (user specific)
        const collected = transactions.reduce((acc, t) => acc + Number(t.amount), 0)
        
        const toCollect = unpaidOrders.reduce((acc, o) => acc + o.total, 0)
        setDailyStats({ count: completedOrders.length, collected, toCollect })

        // --- GROUPING LOGIC START ---
        const sessions: Record<string, Order[]> = {}

        unpaidOrders.forEach(order => {
            // Group Key Priority: Table Session ID -> Table ID -> Order ID (Takeout)
            let key = `order-${order.id}`
            if (order.table_session_id) {
                key = `session-${order.table_session_id}`
            } else if (order.table) {
                key = `table-${order.table.id}`
            }

            if (!sessions[key]) sessions[key] = []
            sessions[key].push(order)
        })

        const newTasks: CashierTask[] = Object.entries(sessions).map(([key, groupOrders]) => {
            // Determine representative info from the group
            const firstOrder = groupOrders[0]
            const totalAmount = groupOrders.reduce((sum, o) => sum + o.total, 0)
            const totalItems = groupOrders.reduce((sum, o) => sum + (o.items?.length || 0), 0)
            
            // Priority: If ANY order in the group is served/ready, the whole table is priority
            const isPriority = groupOrders.some(o => o.status === 'served' || o.status === 'ready')
            
            // Find the earliest opened time
            const earliestTime = groupOrders.reduce((earliest, o) => {
                return new Date(o.opened_at) < new Date(earliest) ? o.opened_at : earliest
            }, firstOrder.opened_at)

            const title = firstOrder.table 
                ? `Table ${firstOrder.table.name}` 
                : (firstOrder.client?.name || 'Takeout')

            return {
                id: key,
                title: title,
                subtitle: `${groupOrders.length} Order${groupOrders.length > 1 ? 's' : ''} • ${totalItems} Items`,
                time: getTimeDiff(earliestTime),
                amount: totalAmount,
                priority: isPriority ? 'high' : 'medium',
                orders: groupOrders
            }
        })
        // --- GROUPING LOGIC END ---

        setTasks(newTasks.sort((a,b) => a.priority === 'high' ? -1 : 1))

    } catch (e) { console.error("Refresh Error:", e) }
}, [isOnline, statusFilter])

    // -- Realtime Subscription --
    React.useEffect(() => {
        let unsubscribe = () => {}

        if (isOnline) {
            toast.success("Register Open", { description: "Ready to process transactions." })
            refreshData()

            // Subscribe to all updates
            unsubscribe = subscribeToKitchen(1, { // Assuming restaurantId 1 for now
                
                onNewOrder: (order) => {
                    // 1. Play Sound
                    playSound('new')
                    
                    // 2. Notification
                    const tableName = order.table?.name || "Takeout"
                    sendNotification("New Order Incoming", `Table ${tableName} just placed an order.`)
                    
                    // 3. Refresh Data
                    refreshData()
                },

                onOrderStatusUpdated: (id, status) => {
                    // Only notify on relevant status changes to avoid noise
                    if (status === 'served' || status === 'ready') {
                        playSound('ready')
                        sendNotification("Order Update", `Order #${id} is now ${status}.`)
                        
                        if (status === 'served') {
                            toast("Bill Ready to Pay", { 
                                description: `Order #${id} has been served.`,
                                icon: <Banknote className="h-4 w-4 text-green-500" /> 
                            })
                        }
                    }
                    refreshData()
                },

                onItemStatusUpdated: (itemId, status) => {
                    // Optional: Play a softer sound or just refresh
                    // playSound('ready') 
                    refreshData()
                }
            })
            
            setIsConnected(true)
        } else {
            setTasks([])
            setIsConnected(false)
        }
        return () => { unsubscribe(); setIsConnected(false) }
    }, [isOnline, refreshData])

  // -- Handlers --
  const handleTaskAction = (task: CashierTask) => {
      setSelectedPaymentTask(task)
  }

    // 2. Updated Payment Handler (Bulk Close)
    const handlePaymentComplete = async (task: CashierTask, method: string = 'cash') => {
        try {
            const mainOrder = task.orders[0]
            const sessionId = mainOrder?.table_session_id
            
            // 1. Prepare Payload
            const payload: TransactionPayload = {
                amount: task.amount,
                payment_method: method,
                // If it's a table session, pass the ID. 
                // If it's a takeout (no session), pass the array of order IDs.
                table_session_id: sessionId || null, 
                order_ids: !sessionId ? task.orders.map(o => o.id) : undefined
            }

            // 2. Hit Endpoint
            await createTransaction(payload)
            
            // 3. UI Feedback
            toast.success("Payment Successful", { 
                description: sessionId 
                    ? `Session #${sessionId} cleared via ${method}.`
                    : `Orders cleared via ${method}.`,
                icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            })
            
            setSelectedPaymentTask(null)
            refreshData()
        } catch (e) {
            console.error(e)
            toast.error("Transaction Failed", { description: "Could not process payment." })
        }
    }

  const handleLogout = async () => {
      await logout()
      navigate("/login")
  }

  // -- Render --
  
  // 1. Payment Overlay View
  if (selectedPaymentTask) {
    return (
      <OrderDetailView 
        orders={selectedPaymentTask.orders} // Changed from 'order' to 'orders'
        onBack={() => setSelectedPaymentTask(null)}
        actionNode={
            <Button 
                className="w-full h-12 text-base bg-green-600 hover:bg-green-700 text-white shadow-sm font-bold tracking-wide"
                onClick={() => handlePaymentComplete(selectedPaymentTask)}
            >
                <CreditCard className="mr-2 h-5 w-5" /> 
                CHARGE {formatMoney(selectedPaymentTask.amount)}
            </Button>
        }
      />
    )
  }

  // 2. Standard View
  return (
    <div className="flex flex-col h-full w-full bg-muted/20 dark:bg-background transition-colors duration-300 font-sans selection:bg-primary/20">
      
      {/* Header */}
      <header className="flex-none pt-4 pb-3 px-4 sm:px-6 sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/60">
          <div className="flex justify-between items-center mb-3">
               <div>
                
                <div className="flex items-center gap-3">
                  {/* Responsive Logo */}
                  <div className="h-6 shrink-0">
                    <img 
                      src="/images/logo.png" // Placeholder for Tapla logo
                      alt="Tapla Logo" 
                      className="h-full w-full object-contain" 
                    />
                  </div>
                  <h1 className="text-xl font-semibold tracking-tight text-foreground hidden sm:block">
                    {activeTab === 'feed' ? 'Cashier Dashboard' : activeTab === 'tables' ? 'Floor Plan' : 'Transactions'}
                  </h1>
                </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="relative flex h-2.5 w-2.5">
                      {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>}
                      <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", isOnline ? "bg-emerald-500" : "bg-muted-foreground/30")}></span>
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {isOnline ? (isConnected ? "Register Online" : "Connecting...") : "Register Closed"}
                    </span>
                  </div>
               </div>
               
               <div className="flex items-center gap-3">
                  <div className={cn(
                      "flex items-center gap-2 p-1 pl-3 pr-1 rounded-full border transition-all duration-300",
                      isOnline ? "bg-emerald-500/10 border-emerald-500/20" : "bg-muted/50 border-border"
                  )}>
                      <span className={cn("text-[10px] font-bold uppercase", isOnline ? "text-emerald-600" : "text-muted-foreground")}>
                          {isOnline ? "Open" : "Closed"}
                      </span>
                      <Switch 
                        checked={isOnline} 
                        onCheckedChange={setIsOnline} 
                        className="data-[state=checked]:bg-emerald-600 scale-90" 
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
                 <StatChip label="Due Bills" value={tasks.length} active />
                 <StatChip label="To Collect" value={formatMoney(dailyStats.toCollect)} warning />
                 <StatChip label="Collected" value={formatMoney(dailyStats.collected)} success />
             </div>
          )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full w-full">
              
              <TabsContent value="feed" className="h-full mt-0 data-[state=inactive]:hidden">
                  {!isOnline ? (
                      <OfflineToggleScreen onStart={() => setIsOnline(true)} />
                  ) : (
                      <PaymentFeed tasks={tasks} onAction={handleTaskAction} />
                  )}
              </TabsContent>

              <TabsContent value="orders" className="h-full mt-0 data-[state=inactive]:hidden">
                    <CashierHistorySection />
              </TabsContent>
          </Tabs>
      </main>

      {/* Bottom Dock */}
      {isOnline && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none animate-in slide-in-from-bottom-6 fade-in duration-500">
             <nav className="pointer-events-auto flex items-center gap-1 p-1.5 bg-background/90 backdrop-blur-xl border border-border/50 rounded-full shadow-2xl shadow-primary/5 ring-1 ring-black/5 dark:ring-white/10">
                 <NavBarItem active={activeTab === 'feed'} onClick={() => setActiveTab('feed')} icon={Banknote} label="Pay" badge={tasks.length} />
                 <div className="w-px h-5 bg-border mx-1" />
                 <NavBarItem active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon={Receipt} label="Transactions" />
             </nav>
          </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* CASHIER HISTORY SECTION                                                    */
/* -------------------------------------------------------------------------- */

function CashierHistorySection() {
    const [orders, setOrders] = React.useState<Order[]>([])
    const [tab, setTab] = React.useState<"all" | "completed">("all")
    const [search, setSearch] = React.useState("")
    const [selectedId, setSelectedId] = React.useState<number | null>(null)
    const [isMobileList, setIsMobileList] = React.useState(true)
    const [statusFilter, setStatusFilter] = React.useState<
    "all" | OrderStatusValue
    >("all")

    const loadOrders = React.useCallback(async () => {
        try {

            const filters: { status?: OrderStatusValue; per_page?: number } = { per_page: 100 }
            
            if (statusFilter !== "all") {
                filters.status = statusFilter
            }

            const { items } = await fetchOrders(filters)
            const allOrders = items || []
            // Cashier sees ALL orders from Today
            setOrders(allOrders)
        } catch (e) { console.error(e) }
    }, [statusFilter])

    React.useEffect(() => {
        loadOrders()
        const interval = setInterval(loadOrders, 10000) 
        return () => clearInterval(interval)
    }, [loadOrders])

    const filteredOrders = React.useMemo(() => {
        let list = orders
        if (tab === "completed") {
            list = list.filter(o => o.status === "completed")
        }
        if (search) {
            const q = search.toLowerCase()
            list = list.filter(o => 
                o.id.toString().includes(q) || 
                o.table?.name.toLowerCase().includes(q) ||
                o.total.toString().includes(q)
            )
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
             <div className={cn(
                "flex flex-col h-full border-r border-border bg-card transition-all duration-300 z-10 w-full md:w-[400px]",
                !isMobileList ? "hidden md:flex" : "flex"
             )}>
                <div className="flex-none p-4 border-b border-border space-y-4 bg-card">
                    <div className="flex items-center justify-between">
                        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                                <TabsTrigger value="all">All Today</TabsTrigger>
                                <TabsTrigger value="completed">Paid</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                    <div className="flex items-center justify-center gap-2 py-1 text-xs font-medium text-muted-foreground bg-muted/20 rounded-md">
                        <CalendarDays className="h-3 w-3" />
                        <span>Daily Transactions</span>
                        {/* <pre>{JSON.stringify(orders, null, 2)}</pre> */}
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search amount, ID..." 
                            className="pl-9 bg-muted/30 border-input"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-hidden bg-card">
                    <ScrollArea className="h-full">
                        <div className="flex flex-col p-2 gap-2 pb-20">
                            {filteredOrders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2 opacity-50">
                                    <Clock className="h-12 w-12 stroke-[1.5]" />
                                    <p className="text-sm">No transactions found</p>
                                </div>
                            ) : (
                                filteredOrders.map(order => (
                                    <OrderListItem 
                                        key={order.id} 
                                        order={order} 
                                        active={selectedId === order.id} 
                                        onClick={() => handleSelect(order.id)} 
                                    />
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>
             </div>

             {/* RIGHT: Detail View */}
             <div className={cn(
                "flex-1 flex flex-col h-full bg-card md:border-l border-border relative",
                isMobileList ? "hidden md:flex" : "flex"
             )}>
                {selectedOrder ? (
                    <OrderDetailView 
                        order={selectedOrder} 
                        onBack={() => setIsMobileList(true)}
                        actionNode={
                            // Allow Re-printing even if paid
                            <Button variant="outline" className="w-full h-12 border-primary/20 text-primary hover:bg-primary/5">
                                <Receipt className="mr-2 h-5 w-5" /> Reprint Receipt
                            </Button>
                        } 
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/5">
                        <div className="h-24 w-24 rounded-full bg-muted/50 border border-border flex items-center justify-center mb-6 shadow-sm">
                            <Wallet className="h-10 w-10 opacity-30 text-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">Transaction Details</h3>
                        <p className="max-w-sm text-muted-foreground text-sm">
                            Select a transaction to view receipt details.
                        </p>
                    </div>
                )}
             </div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* Sub-Components                                                             */
/* -------------------------------------------------------------------------- */

function OfflineToggleScreen({ onStart }: { onStart: () => void }) {
    return (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-background/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
                <div className="relative h-24 w-24 bg-card rounded-3xl shadow-xl border border-border flex items-center justify-center rotate-3 transition-transform hover:rotate-0">
                    <WifiOff className="h-10 w-10 text-muted-foreground" />
                </div>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Register Closed</h2>
            <p className="text-muted-foreground text-center max-w-[260px] mt-2 mb-10 leading-relaxed">
                Open the register to start accepting payments.
            </p>
            <div className="flex items-center gap-4 bg-card p-2 pr-6 pl-2 rounded-full border border-border shadow-lg hover:shadow-xl transition-all cursor-pointer group" onClick={onStart}>
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <Power className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Swipe to</span>
                    <span className="text-sm font-bold text-foreground">Open Register</span>
                </div>
                <Switch checked={false} onCheckedChange={(c) => c && onStart()} className="ml-2 data-[state=checked]:bg-emerald-600" />
            </div>
        </div>
    )
}

function PaymentFeed({ tasks, onAction }: { tasks: CashierTask[], onAction: (t: CashierTask) => void }) {
    if (tasks.length === 0) return (
        <div className="h-full flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95">
             <div className="h-20 w-20 bg-emerald-500/5 rounded-full flex items-center justify-center mb-4 ring-1 ring-emerald-500/10">
                <CheckCircle2 className="h-9 w-9 text-emerald-500/60" />
             </div>
             <h3 className="text-lg font-semibold text-foreground">All Paid Up</h3>
             <p className="text-muted-foreground text-sm mt-1">No pending bills for today.</p>
        </div>
    )

    return (
        <ScrollArea className="h-full bg-muted/10">
            <div className="px-4 py-4 space-y-4 pb-32">
                <div className="flex items-center justify-between px-1">
                     <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Payments Due</span>
                     <Badge variant="secondary" className="bg-background border border-border">{tasks.length}</Badge>
                </div>
                {tasks.map((task, i) => (
                    <PaymentCard key={task.id} task={task} onAction={onAction} index={i} />
                ))}
            </div>
        </ScrollArea>
    )
}

function PaymentCard({ task, onAction, index }: { task: CashierTask, onAction: (t: CashierTask) => void, index: number }) {
    const isPriority = task.priority === 'high'
    // Extract table ID for display, or show Icon for takeout
    const tableId = task.orders[0]?.table?.id

    return (
        <div 
            className="group relative flex flex-col bg-card border border-border shadow-sm rounded-xl overflow-hidden active:scale-[0.99] transition-all duration-200"
            style={{ animation: `slideUp 0.3s ease-out ${index * 0.05}s backwards` }}
        >
            <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 z-10", 
                isPriority ? "bg-emerald-500" : "bg-blue-500"
            )} />

            <div className="flex justify-between items-start p-4 pb-2 pl-5">
                <div className="flex items-center gap-3">
                    <div className={cn("h-11 w-11 rounded-lg flex items-center justify-center font-bold text-lg border bg-muted/20",
                        isPriority ? "text-emerald-600 border-emerald-500/20 bg-emerald-500/5" : "text-foreground border-border"
                    )}>
                        {tableId || <Users className="h-5 w-5 opacity-70" />}
                    </div>
                    <div>
                        <h4 className="font-bold text-[15px] leading-tight text-foreground">{task.title}</h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-mono">
                            {/* Show individual Order IDs if grouped */}
                            <div className="flex -space-x-1">
                                {task.orders.slice(0, 3).map(o => (
                                     <span key={o.id} className="bg-muted px-1.5 rounded-sm border border-background ring-2 ring-background text-[10px]">#{o.id}</span>
                                ))}
                                {task.orders.length > 3 && <span className="pl-2">+{task.orders.length - 3}</span>}
                            </div>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {task.time}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Separator */}
            <div className="relative my-2 pl-1.5">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 rounded-full bg-muted/10 border-r border-border z-20" />
                <div className="border-t-2 border-dashed border-border/60 w-full" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 rounded-full bg-muted/10 border-l border-border z-20" />
            </div>

            <div className="px-4 pb-4 pl-5">
                <div className="flex justify-between items-end mb-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Bill</span>
                    <span className="text-xl font-extrabold text-foreground tracking-tight">{formatMoney(task.amount)}</span>
                </div>
                
                <Button 
                    onClick={() => onAction(task)} 
                    className={cn("w-full font-semibold shadow-sm h-11 rounded-lg text-sm", 
                        isPriority ? "bg-emerald-600 text-white hover:bg-emerald-700" : 
                        "bg-secondary text-white hover:bg-secondary/80 border border-border"
                    )}
                >
                    Review & Pay <ArrowRight className="ml-auto h-4 w-4 opacity-50" />
                </Button>
            </div>
        </div>
    )
}

type OrderDetailViewProps = {
    order?: Order // Keep for history view compatibility
    orders?: Order[] // New prop for Session view
    onBack: () => void
    actionNode?: React.ReactNode
}

function OrderDetailView({ order, orders, onBack, actionNode }: OrderDetailViewProps) {
    // Normalization: Ensure we have an array to work with
    const orderList = orders || (order ? [order] : [])
    const mainOrder = orderList[0]

    // Calculate Grand Totals
    const grandSubtotal = orderList.reduce((acc, o) => acc + (o.subtotal || 0), 0)
    const grandTax = grandSubtotal * 0.10 // Assuming 10% tax logic
    const grandTotal = orderList.reduce((acc, o) => acc + o.total, 0)

    if (!mainOrder) return null

    return (
        <div className="flex flex-col h-full w-full bg-card animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex-none h-16 flex items-center justify-between px-4  bg-card z-20">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground gap-1 -ml-2">
                        <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-card-foreground">
                                {mainOrder.table ? mainOrder.table.name : "Takeout Order"}
                            </h2>
                            {orderList.length === 1 && <StatusBadge status={mainOrder.status} />}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> 1</span>
                            <span>•</span>
                            <span>{orderList.length} Order(s) Combined</span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* List Content */}
            <div className="flex-1 overflow-hidden bg-card relative">
                <ScrollArea className="h-full">
                    <div className="pb-24 pt-2">
                        {orderList.map((ord) => (
                            <div key={ord.id} className="mb-4 last:mb-0">
                                
                                {/* Order Header Separator */}
                                {orderList.length > 1 && (
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="h-px flex-1 bg-border/60" />
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                            Order #{ord.id} • {formatTime(ord.opened_at)}
                                        </span>
                                        <div className="h-px flex-1 bg-border/60" />
                                    </div>
                                )}

                                {/* Items */}
                                <div className="flex flex-col">
                                    {ord.items?.map((item) => (
                                        <div key={item.id} className="flex items-stretch justify-between min-h-[60px]  hover:bg-muted/40 rounded-lg transition-colors px-4 py-3 relative">
                                            <div className="flex flex-col justify-center gap-1 flex-1">
                                                <span className="text-sm font-medium leading-snug text-card-foreground">
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
                                                <span className="text-sm font-bold tabular-nums text-foreground">
                                                    {formatMoney(item.total_price)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                </ScrollArea>
            </div>

            {/* Footer Totals */}
            
            {/* Dashed Divider */}
            <div className="my-8 border-t-2 border-dashed border-border/60" />
            <div className="shrink-0 flex flex-col bg-card pb-[safe]">
                <div className="px-5 py-3 bg-muted/20 border-b border-border space-y-1">
                    <div className="flex justify-between text-sm font-medium text-muted-foreground">
                        <span>Subtotal ({orderList.length} orders)</span>
                        <span>{formatMoney(grandSubtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium text-muted-foreground">
                        <span>Tax (10%)</span>
                        <span>{formatMoney(grandTax)}</span>
                    </div>
                    <div className="flex justify-between items-end mt-2">
                        <span className="text-sm font-bold text-card-foreground">Grand Total</span>
                        <span className="text-xl font-extrabold tracking-tight text-primary">{formatMoney(grandTotal)}</span>
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

function NavBarItem({ active, onClick, icon: Icon, badge, label }: any) {
    return (
        <button onClick={onClick} className={cn(
            "relative px-5 py-2.5 rounded-full transition-all duration-300 flex items-center gap-2 group",
            active ? "bg-emerald-500/10 text-emerald-600" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}>
            <Icon className={cn("h-5 w-5", active && "fill-current")} strokeWidth={active ? 2.5 : 2} />
            {active && <span className="text-xs font-bold animate-in fade-in slide-in-from-left-2 duration-200">{label}</span>}
            
            {badge > 0 && (
                <span className="absolute top-2 right-3 h-2 w-2 bg-destructive rounded-full ring-2 ring-background animate-pulse" />
            )}
        </button>
    )
}

function StatChip({ label, value, active, success, warning }: any) {
    return (
        <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap",
            active ? "bg-primary text-primary-foreground border-primary" :
            success ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" :
            warning ? "bg-amber-500/10 text-amber-700 border-amber-500/20" :
            "bg-background border-border text-muted-foreground"
        )}>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</span>
            <span className="text-sm font-bold">{value}</span>
        </div>
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


function formatTime(dateString: string) {
  if (!dateString) return "--"
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit'
  })
}