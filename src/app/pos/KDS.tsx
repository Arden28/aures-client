"use client"

import * as React from "react"
import { 
  Clock, 
  ChefHat, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  UtensilsCrossed, 
  MoreVertical, 
  RotateCcw,
  Filter,
  GripVertical
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// API
import { 
  fetchOrders, 
  updateOrderStatus, 
  type Order, 
  type OrderStatusValue 
} from "@/api/order"
import { toast } from "sonner"

/* -------------------------------------------------------------------------- */
/* Types & Config                                                             */
/* -------------------------------------------------------------------------- */

const KDS_COLUMNS: { id: OrderStatusValue | "in_progress"; label: string; color: string; icon: any }[] = [
  { id: "pending", label: "Pending", color: "text-slate-500", icon: AlertCircle },
  { id: "in_progress", label: "Cooking", color: "text-blue-500", icon: ChefHat },
  { id: "ready", label: "Ready", color: "text-emerald-500", icon: CheckCircle2 },
  { id: "served", label: "Served", color: "text-indigo-500", icon: UtensilsCrossed },
  { id: "cancelled", label: "Cancelled", color: "text-red-500", icon: XCircle },
]

/* -------------------------------------------------------------------------- */
/* Main Component                                                             */
/* -------------------------------------------------------------------------- */

export default function KDS() {
  const [orders, setOrders] = React.useState<Order[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [lastRefreshed, setLastRefreshed] = React.useState(new Date())
  
  // DnD State
  const [draggedOrderId, setDraggedOrderId] = React.useState<number | null>(null)
  const [activeDropZone, setActiveDropZone] = React.useState<string | null>(null)

  // -- 1. Fetch Data
  const loadOrders = React.useCallback(async () => {
    try {
      const res = await fetchOrders({ per_page: 50 }) 
      setOrders(res.items)
      setLastRefreshed(new Date())
    } catch (error) {
      console.error("Failed to load KDS", error)
      toast.error("Connection error: Could not refresh KDS")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [loadOrders])

  // -- 2. Drag & Drop Logic
  const handleDragStart = (e: React.DragEvent, orderId: number) => {
    setDraggedOrderId(orderId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", orderId.toString())
    // Add a dragging class to body to maybe style cursor globally
    document.body.classList.add('grabbing')
  }

  const handleDragEnd = () => {
    setDraggedOrderId(null)
    setActiveDropZone(null)
    document.body.classList.remove('grabbing')
  }

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault() // Necessary to allow dropping
    e.dataTransfer.dropEffect = "move"
    if (activeDropZone !== status) setActiveDropZone(status)
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: OrderStatusValue) => {
    e.preventDefault()
    setActiveDropZone(null)
    setDraggedOrderId(null)

    const orderId = Number(e.dataTransfer.getData("text/plain"))
    if (!orderId || isNaN(orderId)) return
    
    const order = orders.find(o => o.id === orderId)
    if (!order || order.status === targetStatus) return

    // Optimistic Update
    const oldOrders = [...orders]
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: targetStatus } : o))

    try {
      await updateOrderStatus(orderId, { status: targetStatus })
      toast.success(`Order moved to ${targetStatus.replace("_", " ")}`)
    } catch (err) {
      setOrders(oldOrders)
      toast.error("Failed to update order status")
    }
  }

  const handleManualMove = (orderId: number, status: OrderStatusValue) => {
    const fakeEvent = { preventDefault: () => {}, dataTransfer: { getData: () => orderId } } as any
    handleDrop(fakeEvent, status)
  }

  // Group orders
  const columns = React.useMemo(() => {
    const cols: Record<string, Order[]> = {}
    KDS_COLUMNS.forEach(c => cols[c.id] = [])
    orders.forEach(order => {
      // Normalize statuses
      let colId = order.status
      if (colId === 'completed') colId = 'served'
      if (cols[colId]) cols[colId].push(order)
    })
    return cols
  }, [orders])

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden">
      
      {/* Header */}
      <header className="flex-none h-16 px-6 border-b border-border bg-card flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/10 rounded-lg">
             <ChefHat className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none">Kitchen Display</h1>
            <span className="text-xs text-muted-foreground font-medium">
               {orders.length} Active Tickets
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono hidden sm:inline-block bg-muted px-2 py-1 rounded">
            Updated: {lastRefreshed.toLocaleTimeString()}
          </span>
          <Button variant="outline" size="sm" onClick={loadOrders} className="gap-2 border-border hover:bg-accent">
            <RotateCcw className="h-3.5 w-3.5" /> 
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </header>

      {/* Board Area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-muted/10 dark:bg-black/20">
        <div className="h-full flex p-4 gap-4 min-w-max">
          {KDS_COLUMNS.map((col) => (
            <KDSColumn
              key={col.id}
              id={col.id as OrderStatusValue}
              title={col.label}
              icon={col.icon}
              headerColor={col.color}
              orders={columns[col.id] || []}
              isOver={activeDropZone === col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id as OrderStatusValue)}
              onMove={handleManualMove}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Sub-Components                                                             */
/* -------------------------------------------------------------------------- */

type KDSColumnProps = {
  id: OrderStatusValue
  title: string
  icon: any
  headerColor: string
  orders: Order[]
  isOver: boolean
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onMove: (id: number, status: OrderStatusValue) => void
}

function KDSColumn({ id, title, icon: Icon, headerColor, orders, isOver, onDragOver, onDrop, onMove }: KDSColumnProps) {
  return (
    <div 
      className={cn(
        "flex flex-col w-[340px] h-full rounded-xl border shadow-sm transition-all duration-200",
        // Drag over effects
        isOver 
          ? "bg-primary/5 border-primary ring-2 ring-primary ring-opacity-50 shadow-xl scale-[1.01]" 
          : "bg-card border-border"
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Column Header */}
      <div className="flex-none p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Icon className={cn("h-5 w-5", headerColor)} />
          <span className="font-bold text-sm uppercase tracking-wider text-foreground">{title}</span>
        </div>
        <Badge variant="secondary" className="bg-muted text-foreground font-mono text-xs px-2">
          {orders.length}
        </Badge>
      </div>

      {/* Scrollable List */}
      <ScrollArea className="flex-1">
        <div className="p-3 flex flex-col gap-3 pb-10">
          {orders.map(order => (
            <KDSTicket 
              key={order.id} 
              order={order} 
              onMove={onMove}
            />
          ))}
          {orders.length === 0 && (
            <div className="h-40 flex flex-col items-center justify-center text-muted-foreground/30 border-2 border-dashed border-border/40 rounded-xl m-2">
              <span className="text-xs font-bold uppercase tracking-widest">Empty</span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function KDSTicket({ order, onMove }: { order: Order, onMove: (id: number, s: OrderStatusValue) => void }) {
  const elapsed = useElapsedTimer(order.opened_at)
  const isCancelled = order.status === "cancelled"

  return (
    <div 
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", order.id.toString())
        // Visual hack to hide the dragged element slightly or style it
        // (React handles the ghost image automatically usually)
      }}
      className={cn(
        "group relative flex flex-col rounded-lg border bg-card shadow-sm transition-all duration-200 select-none",
        "hover:shadow-md hover:border-primary/30 cursor-grab active:cursor-grabbing",
        // Status border indicator
        order.status === 'pending' && "border-l-[6px] border-l-slate-400",
        order.status === 'in_progress' && "border-l-[6px] border-l-blue-500",
        order.status === 'ready' && "border-l-[6px] border-l-emerald-500",
        order.status === 'cancelled' && "border-l-[6px] border-l-red-500 opacity-70 grayscale-[0.8]",
        "bg-card border-border" // Fallback/Base
      )}
    >
      {/* Drag Handle (Visual only) */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground">
         <GripVertical className="h-4 w-4" />
      </div>

      {/* Ticket Header */}
      <div className={cn("p-3 pb-2 flex justify-between items-start", isCancelled && "opacity-50")}>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
             <span className="text-lg font-black text-foreground leading-none">
                #{order.id}
             </span>
             {order.table && (
               <span className="text-xs font-bold bg-muted px-1.5 py-0.5 rounded text-foreground truncate max-w-[80px]">
                 {order.table.name}
               </span>
             )}
          </div>
          <span className="text-[10px] font-medium text-muted-foreground mt-1 uppercase tracking-wide">
            Server: {order.waiter?.name || "Staff"}
          </span>
        </div>
        
        {/* Timer */}
        {!isCancelled && (
           <div className={cn(
             "flex items-center gap-1.5 px-2 py-1 rounded font-mono font-bold text-sm tabular-nums shadow-sm border",
             elapsed.colorClass
           )}>
             <Clock className="h-3.5 w-3.5" />
             {elapsed.time}
           </div>
        )}
      </div>

      {/* Ticket Body (Items) */}
      <div className="px-3 py-2 space-y-2 border-t border-border/50 border-dashed">
        {order.items?.map((item, idx) => (
          <div 
            key={idx} 
            className={cn(
                "flex items-start gap-3 text-sm leading-tight",
                // Strikethrough if order is cancelled
                isCancelled && "line-through decoration-red-500/50"
            )}
          >
            <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded bg-foreground text-background font-bold text-xs">
              {item.quantity}
            </span>
            <div className="flex flex-col">
              <span className="font-semibold text-foreground/90">
                {item.product?.name}
              </span>
              {item.notes && (
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/50 px-1.5 py-0.5 rounded w-fit mt-0.5">
                  {item.notes}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Ticket Footer / Actions */}
      <div className="mt-2 p-2 bg-muted/30 border-t border-border rounded-b-lg flex justify-between items-center">
         <span className="text-[10px] font-bold text-muted-foreground uppercase">
            {order.items?.length || 0} Items
         </span>
         
         {/* Mobile/Click Actions */}
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
               <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-background">
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
               </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
               <DropdownMenuItem onClick={() => onMove(order.id, "in_progress")}>Start Cooking</DropdownMenuItem>
               <DropdownMenuItem onClick={() => onMove(order.id, "ready")}>Mark Ready</DropdownMenuItem>
               <DropdownMenuItem onClick={() => onMove(order.id, "served")}>Complete</DropdownMenuItem>
               <DropdownMenuItem onClick={() => onMove(order.id, "cancelled")} className="text-red-500 focus:text-red-600">
                  Cancel Order
               </DropdownMenuItem>
            </DropdownMenuContent>
         </DropdownMenu>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Hooks & Logic                                                              */
/* -------------------------------------------------------------------------- */

function useElapsedTimer(openedAt: string | null) {
  const [time, setTime] = React.useState("00:00")
  const [minutes, setMinutes] = React.useState(0)

  React.useEffect(() => {
    if (!openedAt) return

    const start = new Date(openedAt).getTime()
    
    const update = () => {
      const now = new Date().getTime()
      const diff = Math.max(0, now - start)
      
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      
      setMinutes(m)
      setTime(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [openedAt])

  // Determine color based on elapsed time urgency
  let colorClass = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
  
  if (minutes >= 10) {
     colorClass = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900"
  }
  if (minutes >= 20) {
     colorClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900"
  }
  if (minutes >= 30) {
     colorClass = "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900 animate-pulse"
  }

  return { time, colorClass }
}