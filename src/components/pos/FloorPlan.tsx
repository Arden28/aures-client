"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { 
    UtensilsCrossed, 
    Loader2, 
    Info, 
    Users, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    Play,
    Receipt,
    Trash2,
    RefreshCw,
    Sparkles,
    ArrowRight,
    LogOut
} from "lucide-react"

import { cn, formatMoney } from "@/lib/utils"
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"

import type { FloorPlan } from "@/api/floor"
import { fetchFloorPlans } from "@/api/floor"
import type { Table, TableStatus } from "@/api/table"
import { closeTableSession, fetchTables } from "@/api/table"
import { fetchOrders, type Order } from "@/api/order"
import apiService from "@/api/apiService" // Importing to handle table status updates
import { toast } from "sonner"

/* -------------------------------------------------------------------------- */
/* Types & API Helpers*/
/* -------------------------------------------------------------------------- */

type LoadingState = "idle" | "loading" | "success" | "error"

// Define the OrderStatus type locally for the helper function
type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';


// Helper to update table status directly
async function updateTableStatus(tableId: number, status: TableStatus) {
    // Assuming PATCH /v1/tables/:id allows updating status
    return apiService.patch(`/v1/tables/${tableId}`, { status })
}

/**
 * Determines the most critical status among a list of active orders for display purposes.
 * Priority: READY > SERVED > PREPARING > PENDING
 */
function getCriticalOrderStatus(orders: Order[]): OrderStatus | null {
    if (orders.length === 0) return null;

    const statusPriority: Record<OrderStatus, number> = {
        'ready': 4,
        'served': 3,
        'preparing': 2,
        'pending': 1,
        'completed': 0, // Should be filtered out by fetch, but here for completeness
        'cancelled': 0,
    };

    // Find the order with the highest priority score
    const criticalOrder = orders.reduce((critical, current) => {
        const currentPriority = statusPriority[current.status as OrderStatus] || 0;
        const criticalPriority = statusPriority[critical.status as OrderStatus] || 0;
        
        return currentPriority > criticalPriority ? current : critical;
    }, orders[0]);

    // Return the status of the highest priority order
    return criticalOrder.status as OrderStatus;
}

/* -------------------------------------------------------------------------- */
/* Main Component */
/* -------------------------------------------------------------------------- */

export function FloorPlan() {
    const navigate = useNavigate()
    const [state, setState] = React.useState<LoadingState>("idle")
    
    // Data
    const [floors, setFloors] = React.useState<FloorPlan[]>([])
    const [tables, setTables] = React.useState<Table[]>([])
    const [activeOrders, setActiveOrders] = React.useState<Order[]>([]) 
    const [activeFloorId, setActiveFloorId] = React.useState<number | null>(null)

    const isLoading = state === "loading"

    // Load Data
    const loadData = React.useCallback(async () => {
        try {
            setState("loading")
            const [floorList, tableList, orderRes] = await Promise.all([
                fetchFloorPlans({ status: "active" }),
                fetchTables(),
                //  UPDATED: Fetch all orders that are NOT completed/cancelled
                fetchOrders() 
            ])

            setFloors(floorList)
            setTables(tableList)
            
            const orders = Array.isArray(orderRes) ? orderRes : (orderRes.items || [])

            // Filter logic:
            // We only want orders that are active AND belong to an active session (or no session yet)
            // If a session is closed, those orders are "history" for the floor plan purposes.
            setActiveOrders(orders.filter(o => {
                const isOrderActive = ['pending', 'preparing', 'ready', 'served'].includes(o.status);
                
                // If order has a session, check if that session is active
                // (Assumes backend returns table_session relationship properly)
                const isSessionActive = o.table_session ? o.table_session.status !== 'closed' : true;

                return isOrderActive && isSessionActive;
            }))

            if (floorList.length > 0 && !activeFloorId) {
                setActiveFloorId(floorList[0].id)
            }

            setState("success")
        } catch (err) {
            console.error(err)
            setState("error")
            toast.error("Failed to load floor data.")
        }
    }, [activeFloorId])

    React.useEffect(() => {
        loadData()
    }, [loadData])

    // Memoized Data
    const activeFloor = React.useMemo(
        () => floors.find((f) => f.id === activeFloorId) ?? null,
        [floors, activeFloorId]
    )

    const floorTables = React.useMemo(() => {
        if (!activeFloor) return []
        return tables.filter((t) => t.floor_plan?.id === activeFloor.id)
    }, [tables, activeFloor])

    return (
        <div className="flex h-full w-full flex-1 flex-col gap-4 bg-background p-2 sm:p-4 text-foreground overflow-hidden">
            {/* Header & Legend */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Floor View</h2>
                        <p className="hidden sm:block text-sm text-muted-foreground">
                            Select a table to manage orders.
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={loadData} className="sm:hidden">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
                
                {/* Responsive Legend */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-medium text-muted-foreground rounded-lg border border-border bg-muted/50 p-2">
                    <div className="flex items-center gap-1.5"><LegendDot status="free" /> Free</div>
                    <div className="flex items-center gap-1.5"><LegendDot status="reserved" /> Reserved</div>
                    <div className="flex items-center gap-1.5"><LegendDot status="occupied" /> Occupied</div>
                    <div className="flex items-center gap-1.5"><LegendDot status="needs_cleaning" /> Cleaning</div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col gap-4 overflow-hidden min-h-0">
                {isLoading && floors.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Loading floor layout...
                    </div>
                ) : floors.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        No active floors found.
                    </div>
                ) : (
                    <Tabs
                        value={activeFloorId ? String(activeFloorId) : undefined}
                        onValueChange={(val) => setActiveFloorId(Number(val))}
                        className="flex h-full flex-col gap-3"
                    >
                        {/* Floor Tabs */}
                        <TabsList className="w-full justify-start gap-2 bg-transparent p-0 overflow-x-auto no-scrollbar shrink-0">
                            {floors.map((floor) => (
                                <TabsTrigger
                                    key={floor.id}
                                    value={String(floor.id)}
                                    className={cn(
                                        "shrink-0 rounded-md border border-border bg-card px-3 py-1.5 text-xs sm:text-sm font-medium shadow-sm transition-all text-muted-foreground",
                                        "data-[state=active]:border-primary/50 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                                    )}
                                >
                                    {floor.name}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {/* The Floor Map Container */}
                        <Card className="relative flex-1 overflow-hidden border-none shadow-md bg-[#e3cba8] dark:bg-[#2a241e] rounded-xl ring-1 ring-black/5">
                            <div className="absolute inset-0 z-0 opacity-30 mix-blend-multiply dark:opacity-10" style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H0V20zM20 0h20v20H20V0z' fill='%238B4513' fill-opacity='0.2' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                                backgroundSize: '80px 80px'
                            }} />
                               <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/5 to-black/20 mix-blend-overlay pointer-events-none" />

                            <ScrollArea className="h-full w-full z-10">
                                 <div className="min-w-fit min-h-full p-6 sm:p-12 pb-32">
                                     <div className="flex flex-wrap gap-x-12 sm:gap-x-16 gap-y-12 sm:gap-y-16 justify-start content-start">
                                        {floorTables.length === 0 ? (
                                            <div className="w-full flex h-60 items-center justify-center text-sm font-medium text-amber-950/60 dark:text-amber-100/40">
                                                No tables placed on this floor yet.
                                            </div>
                                        ) : (
                                            floorTables.map((table) => {
                                                
                                                // 1. ROBUST FILTERING
                                                const tableActiveOrders = activeOrders.filter(o => {
                                                    // Ensure order has a table assigned
                                                    if (!o.table || !o.table.id) return false;
                                                    
                                                    // Use String() conversion to handle "5" vs 5 mismatches
                                                    return String(o.table.id) === String(table.id);
                                                });

                                                // 2. Calculate Total
                                                const activeOrdersTotal = tableActiveOrders.reduce((sum, order) => sum + Number(order.total), 0);

                                                // 3. Determine Status
                                                const criticalOrderStatus = getCriticalOrderStatus(tableActiveOrders);

                                                // Debug log (Optional: remove in production)
                                                if (tableActiveOrders.length > 0) {
                                                    console.log(`[Table ${table.name}] Orders Found:`, tableActiveOrders.length, "IDs:", tableActiveOrders);
                                                }

                                                //  UPDATED LOGIC END
                                                return (
                                                    <RealisticTableWithChairs
                                                        key={table.id}
                                                        table={table}
                                                        tableActiveOrders={tableActiveOrders} // Pass all active orders
                                                        activeOrdersTotal={activeOrdersTotal} // Pass the sum
                                                        criticalOrderStatus={criticalOrderStatus} // Pass the derived status
                                                        navigate={navigate}
                                                        refreshData={loadData}
                                                    />
                                                )
                                            })
                                        )}
                                     </div>
                                 </div>
                                 <ScrollBar orientation="horizontal" />
                                 <ScrollBar orientation="vertical" />
                            </ScrollArea>
                        </Card>
                    </Tabs>
                )}
            </div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/* Sub-Components */
/* -------------------------------------------------------------------------- */

//  UPDATED INTERFACE
interface TableProps {
    table: Table
    tableActiveOrders: Order[]
    activeOrdersTotal: number
    criticalOrderStatus: OrderStatus | null
    navigate: any
    refreshData: () => void
}

function RealisticTableWithChairs({ 
    table, 
    tableActiveOrders, 
    activeOrdersTotal, 
    criticalOrderStatus, 
    navigate, 
    refreshData 
}: TableProps) {
    //  UPDATED LOGIC: Base visual status on critical order status if active orders exist
    const isOccupied = tableActiveOrders.length > 0
    
    // If occupied, use the critical order status. Otherwise, use the table's manual status.
    const effectiveStatus = isOccupied 
        ? (criticalOrderStatus || 'occupied') // Fallback to 'occupied' if somehow status is null
        : table.status;
    
    const statusStyles = tableStatusStylesReal(effectiveStatus as TableStatus)
    const isRound = table.capacity <= 4
    const seatCount = Math.min(Math.max(table.capacity, 2), 10)
    const seats = Array.from({ length: seatCount })
    const containerSize = 120 
    const tableSize = 60 
    const centerOffset = (containerSize - tableSize) / 2 
    const radius = tableSize / 2 + 18 

    // Handlers
    const handleMarkCleaned = async () => {
        try {
            await updateTableStatus(table.id, "free")
            toast.success(`${table.name} is now free`)
            refreshData()
        } catch (e) {
            toast.error("Update failed")
        }
    }

    const handleMarkNeedsCleaning = async () => {
        try {
            await updateTableStatus(table.id, "needs_cleaning")
            toast.success(`${table.name} marked for cleaning`)
            refreshData()
        } catch (e) {
            toast.error("Update failed")
        }
    }

    return (
        <Popover>
            <div className="relative flex-shrink-0" style={{ width: containerSize, height: containerSize }}>
                {seats.map((_, index) => {
                    const angle = (index / seatCount) * 2 * Math.PI - Math.PI / 2 
                    const x = (containerSize / 2) + radius * Math.cos(angle)
                    const y = (containerSize / 2) + radius * Math.sin(angle)
                    const rotation = (angle * 180) / Math.PI + 90
                    return (
                        <div
                            key={index}
                            className={cn(
                                "absolute h-5 w-6 rounded-[2px] border border-amber-950/30 shadow-sm transition-all",
                                "bg-gradient-to-br from-[#cba37e] to-[#a67c52] dark:from-[#5c4033] dark:to-[#3e2b22]",
                            )}
                            style={{
                                top: y,
                                left: x,
                                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                                clipPath: "polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)" 
                            }}
                        />
                    )
                })}

            <PopoverTrigger asChild>
                <button
                    type="button"
                    style={{ top: centerOffset, left: centerOffset, width: tableSize, height: tableSize }}
                    className={cn(
                        "absolute group flex flex-col items-center justify-center transition-all hover:-translate-y-0.5 active:scale-95 z-10",
                        isRound ? "rounded-full" : "rounded-lg",
                        "bg-gradient-to-br from-[#f3e4d0] to-[#dcbca0] dark:from-[#8b5a2b] dark:to-[#5c3a1e] border-[2px] shadow-md",
                        statusStyles.border
                    )}
                >
                    <div className={cn(
                        "absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 bg-black/10 backdrop-blur-[1px]",
                        isRound ? "rounded-full" : "rounded-lg",
                    )}>
                        <Info className={cn("h-4 w-4", statusStyles.textIcon)} />
                    </div>

                    <div className="flex flex-col items-center gap-0 group-hover:opacity-0 transition-opacity duration-200">
                        <span className="text-[11px] font-extrabold text-amber-950 dark:text-amber-100 leading-none">
                            {table.name}
                        </span>
                        {/*  UPDATED: Display sum of ALL active orders */}
                        {isOccupied && (
                            <span className="text-[9px] font-bold text-amber-900/80 dark:text-amber-100/80 mt-0.5">
                                {formatMoney(activeOrdersTotal)}
                            </span>
                        )}
                    </div>
                </button>
            </PopoverTrigger>
            </div>

            <PopoverContent 
                className="w-[90vw] max-w-[320px] p-0 overflow-hidden rounded-xl shadow-2xl border-border bg-card text-card-foreground" 
                align="center" 
                sideOffset={-20}
                collisionPadding={16}
            >
                <TableDetailsPopoverContent 
                    table={table} 
                    //  PASSING THE ARRAY AND TOTAL INSTEAD OF SINGLE ORDER
                    tableActiveOrders={tableActiveOrders} 
                    activeOrdersTotal={activeOrdersTotal} 
                    statusStyles={statusStyles} 
                    navigate={navigate}
                    onMarkClean={handleMarkCleaned}
                    onMarkDirty={handleMarkNeedsCleaning}
                    refreshData={refreshData}
                />
            </PopoverContent>
        </Popover>
    )
}

function TableDetailsPopoverContent({ 
    table, 
    tableActiveOrders, 
    activeOrdersTotal,
    statusStyles, 
    navigate,
    onMarkClean,
    onMarkDirty,
    refreshData // Add refreshData to props to trigger reload after closing
}: { 
    table: Table, 
    tableActiveOrders: Order[], 
    activeOrdersTotal: number,
    statusStyles: any, 
    navigate: any,
    onMarkClean: () => void,
    onMarkDirty: () => void,
    refreshData?: () => void
}) {
    
    // Logic extraction
    const hasActiveOrders = tableActiveOrders.length > 0 
    const criticalOrder = tableActiveOrders[0] 
    const elapsed = useElapsedTimer(criticalOrder?.opened_at)

    // If there are no active orders, strictly rely on the table status.
    const effectiveStatus = hasActiveOrders ? (criticalOrder?.status || 'Active') : table.status;
    
    // Status Checks
    const isNeedsCleaning = table.status === 'needs_cleaning'
    const isReserved = table.status === 'reserved'
    const isOccupiedButEmpty = table.status === 'occupied' && !hasActiveOrders;

    // HANDLER: Finish Service / Close Session
    const handleFinishService = async () => {
        if (!criticalOrder?.table_session_id) {
            toast.error("No active session found for this table.");
            return;
        }

        if (!window.confirm(`Finish service for ${table.name}? \n\nThis will close the session and mark table for cleaning.`)) {
            return;
        }

        try {
            await closeTableSession(table.code, criticalOrder.table_session_id);
            toast.success("Service finished. Table marked for cleaning.");
            if (refreshData) refreshData();
        } catch (e: any) {
            console.error("Close Session Error:", e);
            
            // --- ROBUST ERROR EXTRACTION ---
            // 1. Try standard Laravel JSON message (e.g. "Cannot close session...")
            let msg = e.response?.data?.message;

            // 2. If 'message' is missing, check if it's inside an 'error' key
            if (!msg && e.response?.data?.error) {
                msg = e.response.data.error;
            }

            // 3. If still nothing, fallback to the HTTP status text or a default
            if (!msg) {
                msg = e.message || "Could not close session. Please try again.";
            }

            toast.error(msg);
        }
    }
    
    // NEW HANDLER: Force Reset (Mismatch State)
    const handleFreeTableMismatch = async () => {
        try {
            await updateTableStatus(table.id, "free");
            toast.success(`${table.name} status reset to Free.`);
            onMarkClean(); 
        } catch (e) {
            toast.error("Failed to reset table status.");
        }
    };

    return (
        <div className="flex flex-col bg-card">
            
            {/* 1. Header Section */}
            <div className="flex items-center justify-between px-4 py-3 mb-2 bg-muted/20 border-b border-border">
                <div className="flex flex-col">
                    <h4 className="text-sm font-bold text-foreground">{table.name}</h4>
                    <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                        {hasActiveOrders ? `Session #${criticalOrder?.table_session_id}` : `Code: ${table.code}`}
                    </span>
                </div>
                <Badge variant="outline" className={cn("border-0 font-semibold capitalize", statusStyles.badgeCls)}>
                    {statusStyles.icon && <statusStyles.icon className="w-3 h-3 mr-1.5" />}
                    {hasActiveOrders ? (criticalOrder?.status || 'Active') : table.status.replace("_", " ")}
                </Badge>
            </div>

            {/* 2. Quick Stats Grid - ONLY IF ACTIVE ORDERS EXIST */}
            {hasActiveOrders && (
                <div className="p-3">
                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-2 border border-dashed border-border">
                        <div className="flex flex-col items-center justify-center gap-1">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-bold">
                                <Clock className="w-3 h-3" /> Time
                            </div>
                            <span className="text-sm font-semibold text-foreground">{elapsed}</span>
                        </div>

                        <div className="flex flex-col items-center justify-center gap-1">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-bold">
                                <Receipt className="w-3 h-3" /> Total
                            </div>
                            <span className="text-sm font-semibold text-foreground">
                                {formatMoney(activeOrdersTotal)}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Action Buttons */}
            <div className={cn("p-3 flex flex-col gap-2", !hasActiveOrders && "pt-0")}>
                
                {/* A. TABLE IS ACTIVE: Close Session Button */}
                {hasActiveOrders && (
                    <Button 
                        onClick={handleFinishService} 
                        className="w-full h-10 shadow-sm border border-border/50 text-white" 
                        variant="secondary"
                    >
                        <LogOut className="w-3.5 h-3.5 mr-2 opacity-70" />
                        Finish Service
                    </Button>
                )}

                {/* B. MISMATCH STATE: Occupied but no active orders */}
                {isOccupiedButEmpty && (
                    <Button 
                        onClick={handleFreeTableMismatch} 
                        className="w-full h-9 text-xs sm:text-sm" 
                        variant="destructive"
                    >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        Force Reset Table
                    </Button>
                )}
                
                {/* C. NEEDS CLEANING STATE */}
                {isNeedsCleaning && !hasActiveOrders && !isReserved && (
                    <div className="space-y-3">
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center dark:border-blue-800 dark:bg-blue-900/20">
                            <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                                Session closed. Table needs cleaning before seating new guests.
                            </p>
                        </div>
                        <Button 
                            onClick={onMarkClean} 
                            className="w-full h-11 text-base font-semibold shadow-md bg-blue-600 hover:bg-blue-700 text-white border-transparent"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Mark as Clean & Free
                        </Button>
                    </div>
                )}

                {/* D. FREE STATE: No button needed (Orders start elsewhere) */}
                {!hasActiveOrders && !isNeedsCleaning && !isOccupiedButEmpty && !isReserved && (
                    <div className="py-2 text-center text-xs text-muted-foreground italic">
                        Table is free. Assign via Order screen.
                    </div>
                )}
            </div>
        </div>
    )
}

/* ---------------- Helpers ---------------- */

function useElapsedTimer(openedAt: string | null | undefined) {
    const [time, setTime] = React.useState("0m")

    React.useEffect(() => {
        if (!openedAt) return
        
        // FIX: Force UTC interpretation if the string doesn't specify a timezone.
        // This prevents the timer from starting at "60m" or "3h" due to local offsets.
        let cleanDateStr = openedAt
        if (!openedAt.endsWith("Z") && !openedAt.includes("+")) {
            cleanDateStr += "Z"
        }

        const start = new Date(cleanDateStr).getTime()
        
        const update = () => {
            const now = new Date().getTime()
            // Math.max(0, ...) ensures we never show negative time if client clock is slightly behind
            const diff = Math.max(0, now - start)

            const m = Math.floor(diff / 60000)
            const h = Math.floor(m / 60)
            
            if (h > 0) {
                setTime(`${h}h ${m % 60}m`)
            } else {
                setTime(`${m}m`)
            }
        }
        
        update()
        const interval = setInterval(update, 60000) 
        return () => clearInterval(interval)
    }, [openedAt])

    return time
}

function LegendDot({ status, className }: { status: TableStatus, className?: string }) {
    const styles = tableStatusStylesReal(status)
    return (
        <span
            className={cn(
                "inline-block h-2.5 w-2.5 rounded-full shadow-sm ring-1 ring-black/5 dark:ring-white/10",
                styles.dotBg,
                className
            )}
        />
    )
}

function tableStatusStylesReal(status: TableStatus) {
    switch (status) {
        case "free":
            return {
                border: "border-emerald-500/50 dark:border-emerald-400/60",
                textIcon: "text-emerald-700 dark:text-emerald-300",
                dotBg: "bg-emerald-500",
                badgeCls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
                icon: CheckCircle2
            }
        case "reserved":
            return {
                border: "border-amber-500/50 dark:border-amber-400/60",
                textIcon: "text-amber-700 dark:text-amber-300",
                dotBg: "bg-amber-500",
                badgeCls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
                icon: Clock
            }
        case "occupied":
            return {
                border: "border-red-500/50 dark:border-red-400/60",
                textIcon: "text-red-700 dark:text-red-300",
                dotBg: "bg-red-500",
                badgeCls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
                icon: UtensilsCrossed
            }
        case "needs_cleaning":
            return {
                // Changing to a more obvious "Blue/Info" or "Purple" style to indicate "Action Needed"
                // rather than just gray/slate which looks disabled.
                border: "border-blue-400 dark:border-blue-500 border-dashed", // Dashed border implies "incomplete/transition"
                textIcon: "text-blue-600 dark:text-blue-300",
                dotBg: "bg-blue-400 animate-pulse", // Pulse the dot to catch attention
                badgeCls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
                icon: Sparkles // Use Sparkles icon
            }
        default:
            return {
                border: "border-border", textIcon: "text-muted-foreground", dotBg: "bg-muted",
                badgeCls: "bg-muted text-muted-foreground", icon: Info
            }
    }
}