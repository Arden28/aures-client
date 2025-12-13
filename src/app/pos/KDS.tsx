"use client"

import * as React from "react"
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MoreHorizontal, 
  RotateCcw,
  GripVertical,
  Flame,
  Check,
  Filter,
  ChevronDown,
  // Added icons needed for the dropdown
  Sun,
  Moon,
  LogOut,
} from "lucide-react"

// --- Mobile Drag & Drop Polyfill ---
import { polyfill } from "mobile-drag-drop"
import { scrollBehaviourDragImageTranslateOverride } from "mobile-drag-drop/scroll-behaviour"
import "mobile-drag-drop/default.css"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu"
// Added Avatar for the user icon
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar" 
import { toast } from "sonner"

import { 
  fetchKDSOrders, 
  updateKDSOrderStatus, 
  type KDSOrder, 
  type OrderStatusValue 
} from "@/api/kds"
import { useThemeToggle } from "@/layouts/PosLayout"
import useAuth from "@/hooks/useAuth"
import { useNavigate } from "react-router-dom"

/* -------------------------------------------------------------------------- */
/* Config                                                                      */
/* -------------------------------------------------------------------------- */

const KDS_COLUMNS: { id: OrderStatusValue | 'preparing'; label: string; color: string; bg: string; icon: any }[] = [
  { id: "pending", label: "To Do", color: "text-zinc-500", bg: "bg-zinc-500/10", icon: AlertCircle },
  { id: 'preparing', label: "Cooking", color: "text-orange-500", bg: "bg-orange-500/10", icon: Flame },
  { id: "ready", label: "Ready to Serve", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: CheckCircle2 },
  { id: "served", label: "Completed", color: "text-blue-500", bg: "bg-blue-500/10", icon: Check },
]

type TimeFilter = 'all' | '30m' | '60m'

/* -------------------------------------------------------------------------- */
/* Audio Helper                                                                */
/* -------------------------------------------------------------------------- */

const playAudio = (type: 'new' | 'move') => {
  const file = type === 'new' ? '/sounds/kds.mp3' : '/sounds/kds.mp3'
  const audio = new Audio(file)
  audio.volume = 0.6 
  audio.play().catch((e) => console.warn("Audio interaction needed:", e))
}

/* -------------------------------------------------------------------------- */
/* Main Component                                                              */
/* -------------------------------------------------------------------------- */

export default function KDS() {
  const navigate = useNavigate()
    const { user, logout } = useAuth()
    const { theme, toggleTheme } = useThemeToggle()

  const [orders, setOrders] = React.useState<KDSOrder[]>([])
  const [draggedOrderId, setDraggedOrderId] = React.useState<number | null>(null)
  const [activeDropZone, setActiveDropZone] = React.useState<string | null>(null)
  const [timeFilter, setTimeFilter] = React.useState<TimeFilter>('all')

  // Refs to access state inside intervals without dependencies
  const ordersRef = React.useRef(orders)
  const isDraggingRef = React.useRef(false)

  const restaurantId = 1 
  
  // Safe User Data
  const userName = user?.name
  const userRole = user?.role

  // Sync ref with state
  React.useEffect(() => {
    ordersRef.current = orders
    isDraggingRef.current = draggedOrderId !== null
  }, [orders, draggedOrderId])

  // -- 0. Initialize Mobile Polyfill
  React.useEffect(() => {
    polyfill({
      dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride,
      holdToDrag: 100 // Slight delay on mobile to prevent accidental drags
    });
    
    // Cleanup simple workaround for iOS scroll locking
    const handleTouchMove = (e: TouchEvent) => {
        if (isDraggingRef.current) { e.preventDefault(); }
    }
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    return () => document.removeEventListener('touchmove', handleTouchMove)
  }, [])

  // -- 1. Data Loading (Initial)
  const loadOrders = React.useCallback(async (isSilent = false) => {
    try {
      const data = await fetchKDSOrders(restaurantId)
      const freshOrders = Array.isArray(data) ? data : []
      
      if (!isSilent) {
        setOrders(freshOrders)
        toast.success("Board updated")
      }
      return freshOrders
    } catch (error) {
      if (!isSilent) toast.error("Connection error")
      return []
    }
  }, [restaurantId])

  React.useEffect(() => {
    loadOrders(false) // Initial load
  }, [loadOrders])

  // -- 2. Automation: Polling for New Orders
  React.useEffect(() => {
    const POLL_INTERVAL = 10000 // 10 Seconds

    const checkForNewOrders = async () => {
      // Don't update if user is dragging to prevent UI jumps
      if (isDraggingRef.current) return 

      try {
        const freshOrders = await fetchKDSOrders(restaurantId)
        const currentOrders = ordersRef.current
        
        // Check for new IDs
        const currentIds = new Set(currentOrders.map(o => o.id))
        const newOrdersFound = freshOrders.filter(o => !currentIds.has(o.id))

        if (newOrdersFound.length > 0) {
          playAudio('new')
          toast.info(`${newOrdersFound.length} New Order(s) Received!`)
        }

        // If data changed
        if (JSON.stringify(freshOrders) !== JSON.stringify(currentOrders)) {
            setOrders(freshOrders)
        }

      } catch (e) {
        console.error("Auto-check failed", e)
      }
    }

    const intervalId = setInterval(checkForNewOrders, POLL_INTERVAL)
    return () => clearInterval(intervalId)
  }, [restaurantId])


  // -- 3. Logic: Filter Orders for Display
  const filteredOrders = React.useMemo(() => {
    if (timeFilter === 'all') return orders

    const now = Date.now()
    const cutoffMinutes = timeFilter === '30m' ? 30 : 60
    
    return orders.filter(order => {
        const orderTime = new Date(order.opened_at).getTime()
        const diffInMinutes = (now - orderTime) / 60000
        return diffInMinutes <= cutoffMinutes
    })
  }, [orders, timeFilter])

  const columns = React.useMemo(() => {
    const cols: Record<string, KDSOrder[]> = {}
    KDS_COLUMNS.forEach(c => { cols[c.id] = [] })
    
    filteredOrders.forEach(order => {
      let colId = order.status
      if (colId === "completed") colId = "served"
      if (Array.isArray(cols[colId])) cols[colId].push(order)
    })
    return cols
  }, [filteredOrders])


  // -- 4. DnD Logic
  const handleDragStart = (e: React.DragEvent, orderId: number) => {
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", orderId.toString())
    setDraggedOrderId(orderId)
    // Force vibration on mobile if supported
    if (navigator.vibrate) navigator.vibrate(50) 
  }

  const handleDragEnd = () => {
    setActiveDropZone(null)
    setDraggedOrderId(null)
  }

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault() 
    e.dataTransfer.dropEffect = "move"
    if (activeDropZone !== status) setActiveDropZone(status)
  }

  const getErrorMessage = (err: any) => {
    return err.response?.data?.message || err.message || "Connection lost. Please try again."
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: OrderStatusValue) => {
    e.preventDefault()
    setActiveDropZone(null)
    setDraggedOrderId(null)

    const orderId = Number(e.dataTransfer.getData("text/plain"))
    if (!orderId || isNaN(orderId)) return
    
    const order = orders.find(o => o.id === orderId)
    if (!order || order.status === targetStatus) return

    const oldOrders = [...orders]
    
    // Optimistic Update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: targetStatus } : o))

    try {
      await updateKDSOrderStatus(orderId, targetStatus)
      playAudio('move')
      toast.success(`Ticket #${orderId} moved to ${targetStatus}`)
    } catch (err: any) {
      setOrders(oldOrders)
      toast.error("Action Failed", {
        description: getErrorMessage(err),
        duration: 4000
      })
    }
  }

  const handleManualMove = async (orderId: number, status: OrderStatusValue) => {
    const oldOrders = [...orders]
    
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    
    try {
        await updateKDSOrderStatus(orderId, status)
        playAudio('move')
    } catch (err: any) {
        setOrders(oldOrders)
        toast.error("Action Failed", {
          description: getErrorMessage(err),
          duration: 4000
        })
    }
  }

  const getFilterLabel = () => {
      switch(timeFilter) {
          case '30m': return 'Last 30 Mins';
          case '60m': return 'Last 1 Hour';
          default: return 'All Active';
      }
  }
  
  const handleLogout = async () => {
      await logout()
      navigate("/login")
  }


  return (
    <div className="flex flex-col h-screen w-full bg-zinc-50/50 dark:bg-zinc-950 text-foreground overflow-hidden font-sans">
      
      {/* Header */}
      <header className="flex-none h-14 px-4 md:px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
           <img src="/images/logo.png" alt="" className="h-[20px]" />
           <span className="font-semibold text-sm tracking-tight text-zinc-700 dark:text-zinc-200 hidden sm:inline">
             Kitchen Display
           </span>
           <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1 hidden sm:block" />
           <span className="text-xs text-zinc-500 font-mono">
             {filteredOrders.filter(o => o.status !== 'served' && o.status !== 'cancelled').length} ACTIVE
           </span>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          
          {/* Modern Select Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2">
                    <Filter className="h-3 w-3 text-zinc-500" />
                    <span>{getFilterLabel()}</span>
                    <ChevronDown className="h-3 w-3 text-zinc-400" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs text-zinc-500 font-normal">Filter by Time</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setTimeFilter('all')}>
                    Show All Active
                    {timeFilter === 'all' && <Check className="ml-auto h-3 w-3" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setTimeFilter('30m')}>
                    Last 30 Minutes
                    {timeFilter === '30m' && <Check className="ml-auto h-3 w-3" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTimeFilter('60m')}>
                    Last 1 Hour
                    {timeFilter === '60m' && <Check className="ml-auto h-3 w-3" />}
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="sm" onClick={() => loadOrders(false)} className="h-8 w-8 p-0 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:bg-zinc-50">
            <RotateCcw className="h-3.5 w-3.5 text-zinc-600" /> 
          </Button>

          {/* USER DROPDOWN */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:ring-2 hover:ring-zinc-400/20 transition-all">
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>{userName?.charAt(0)}</AvatarFallback>
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
                {/* Theme Toggle */}
                <DropdownMenuItem onClick={toggleTheme}>
                    {theme === 'light' ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
                    <span>Theme: {theme === 'light' ? 'Light' : 'Dark'}</span>
                </DropdownMenuItem>
                {/* Logout */}
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* END USER DROPDOWN */}

        </div>
      </header>

      {/* Board Area */}
      <div className="flex-1 p-2 md:p-4 overflow-y-auto md:overflow-hidden bg-zinc-50 dark:bg-black/20">
        <div className="h-auto md:h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {KDS_COLUMNS.map((col) => (
            <KDSColumn
              key={col.id}
              config={col}
              orders={columns[col.id] || []}
              isOver={activeDropZone === col.id}
              draggedOrderId={draggedOrderId}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id as OrderStatusValue)}
              onMove={handleManualMove}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Sub-Components                                                              */
/* -------------------------------------------------------------------------- */

type KDSColumnProps = {
  config: typeof KDS_COLUMNS[0]
  orders: KDSOrder[]
  isOver: boolean
  draggedOrderId: number | null
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onMove: (id: number, status: OrderStatusValue) => void
  onDragStart: (e: React.DragEvent, id: number) => void
  onDragEnd: () => void
}

function KDSColumn({ config, orders, isOver, draggedOrderId, onDragOver, onDrop, onMove, onDragStart, onDragEnd }: KDSColumnProps) {
  const Icon = config.icon

  return (
    <div 
      className={cn(
        "flex flex-col rounded-xl transition-colors duration-200 overflow-hidden",
        "h-[75vh] md:h-full", 
        // Visual indicator when dragging over
        isOver ? "bg-zinc-100/80 dark:bg-zinc-800/50 ring-2 ring-inset ring-zinc-200 dark:ring-zinc-700" : "bg-transparent"
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex-none px-3 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <Badge variant="outline" className={cn("border-0 font-medium px-2 py-1 rounded-md bg-white dark:bg-zinc-800 shadow-sm", config.color)}>
             <Icon className="h-3.5 w-3.5 mr-1.5" />
             {config.label}
           </Badge>
           <span className="text-xs text-zinc-400 font-mono font-medium">
             {orders.length}
           </span>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 pb-2 h-full">
        <div className="flex flex-col gap-3 pb-4">
          {orders.map(order => (
            <KDSTicket 
              key={order.id} 
              order={order} 
              isDragging={draggedOrderId === order.id}
              onMove={onMove}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))}
          
          {orders.length === 0 && (
            <div className="h-32 flex flex-col items-center justify-center text-zinc-300 dark:text-zinc-700 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 mt-1">
              <span className="text-[10px] font-medium uppercase tracking-widest">No Tickets</span>
            </div>
          )}
          
          {isOver && (
            <div className="h-24 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900/50 animate-pulse flex items-center justify-center">
                <span className="text-xs text-zinc-400 font-medium">Drop here</span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function KDSTicket({ order, isDragging, onMove, onDragStart, onDragEnd }: { order: KDSOrder, isDragging: boolean, onMove: (id: number, s: OrderStatusValue) => void, onDragStart: (e: any, id: number) => void, onDragEnd: () => void }) {
  const elapsed = useElapsedTimer(order.opened_at)
  const isCancelled = order.status === "cancelled"

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, order.id)}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative flex flex-col rounded-xl border bg-white dark:bg-zinc-900 shadow-sm transition-all duration-200 select-none", 
        // Touch manipulation is important for polyfill
        "touch-manipulation",
        "hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-600",
        isDragging && "opacity-50 rotate-3 scale-[0.98] cursor-grabbing shadow-xl ring-2 ring-primary z-50", 
        !isDragging && "cursor-grab active:cursor-grabbing",
        "border-zinc-200 dark:border-zinc-800"
      )}
    >
      <div className="p-3 pb-2 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-start bg-zinc-50/30 dark:bg-zinc-800/10">
        <div className="flex flex-col gap-1">
           <div className="flex items-center gap-2">
             <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
               #{order.id.toString().slice(-3)}
             </span>
             {order.table && (
               <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700">
                 {order.table.name}
               </Badge>
             )}
           </div>
           <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wide">
             {order.waiter?.name || "Server"}
           </span>
        </div>
        
        {!isCancelled && order.status !== 'served' && (
           <div className={cn(
             "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono font-medium transition-colors",
             elapsed.colorClass
           )}>
             <Clock className="h-3 w-3" />
             {elapsed.time}
           </div>
        )}
      </div>

      <div className="p-3 space-y-2.5">
        {order.items?.map((item, idx) => (
          <div key={idx} className={cn("flex items-start gap-3", isCancelled && "opacity-50 line-through")}>
             <div className="shrink-0 h-5 w-5 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
               <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-mono">
                 {item.quantity}
               </span>
             </div>
             
             <div className="flex flex-col leading-none pt-0.5">
               <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                 {item?.product?.name}
               </span>
               {item.notes && (
                 <p className="text-[11px] text-orange-600 dark:text-orange-400 mt-1 italic font-medium">
                   "{item.notes}"
                 </p>
               )}
             </div>
          </div>
        ))}
      </div>

      <div className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
          {/* MOBILE FIX: We add touch-none here. 
              This tells the browser: "If the user touches this specific icon, DO NOT SCROLL." 
              This allows the drag polyfill to pick up the event immediately.
          */}
          <span className="text-[10px] text-zinc-400 flex items-center gap-1 cursor-grab touch-none p-2 -ml-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
             <GripVertical className="h-3 w-3" /> Drag
          </span>
          
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                      <MoreHorizontal className="h-4 w-4 text-zinc-500" />
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 font-medium">
                 <DropdownMenuItem onClick={() => onMove(order.id, 'preparing')}>
                     <Flame className="h-3.5 w-3.5 mr-2 text-orange-500" /> Cooking
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => onMove(order.id, "ready")}>
                     <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-500" /> Ready
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => onMove(order.id, "served")}>
                     <Check className="h-3.5 w-3.5 mr-2 text-blue-500" /> Served
                 </DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
      </div>
    </div>
  )
}

function useElapsedTimer(openedAt: string | null) {
  const [time, setTime] = React.useState("00:00")
  const [minutes, setMinutes] = React.useState(0)

  React.useEffect(() => {
    if (!openedAt) return

    // FIX: Force UTC interpretation if timezone is missing
    let cleanDateStr = openedAt
    if (!openedAt.endsWith("Z") && !openedAt.includes("+")) {
      cleanDateStr += "Z"
    }

    const start = new Date(cleanDateStr).getTime()

    const update = () => {
      const now = new Date().getTime()
      // Math.max(0, ...) prevents negative time if local clock is slightly behind
      const diff = Math.max(0, now - start) 

      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)

      setMinutes(m)
      setTime(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
    }

    update() // Run immediately to avoid 1s delay
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [openedAt])

  let colorClass = "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
  if (minutes >= 15) colorClass = "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
  if (minutes >= 25) colorClass = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse"

  return { time, colorClass }
}