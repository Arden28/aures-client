// src/app/pos/PosTables.tsx
"use client"

import * as React from "react"
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
  ChefHat
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
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
import { fetchTables } from "@/api/table"
import { toast } from "sonner"

type LoadingState = "idle" | "loading" | "success" | "error"

export default function PosTables() {
  const [state, setState] = React.useState<LoadingState>("idle")
  const [floors, setFloors] = React.useState<FloorPlan[]>([])
  const [tables, setTables] = React.useState<Table[]>([])
  const [activeFloorId, setActiveFloorId] = React.useState<number | null>(null)

  const isLoading = state === "loading"

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setState("loading")
        const [floorList, tableList] = await Promise.all([
          fetchFloorPlans({ status: "active" }),
          fetchTables(),
        ])

        if (!mounted) return

        setFloors(floorList)
        setTables(tableList)

        if (floorList.length > 0) {
          setActiveFloorId(floorList[0].id)
        }

        setState("success")
      } catch (err) {
        console.error(err)
        if (mounted) {
          setState("error")
          toast.error("Failed to load floor plans or tables.")
        }
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  const activeFloor = React.useMemo(
    () => floors.find((f) => f.id === activeFloorId) ?? null,
    [floors, activeFloorId]
  )

  const floorTables = React.useMemo(() => {
    if (!activeFloor) return []
    return tables.filter((t) => t.floor_plan?.id === activeFloor.id)
  }, [tables, activeFloor])

  return (
    <div className="flex h-full w-full flex-1 flex-col gap-4 bg-background p-2 sm:p-4 text-foreground">
      {/* Header & Legend */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Floor View</h2>
          <p className="hidden sm:block text-sm text-muted-foreground">
            Select a table to manage orders.
          </p>
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
      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        {isLoading ? (
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
            <TabsList className="w-full justify-start gap-2 bg-transparent p-0 overflow-x-auto no-scrollbar">
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
            {/* Note: We keep specific colors for the floor itself to maintain realism, but ensure text contrasts well */}
            <Card className="relative flex-1 overflow-hidden border-none shadow-md bg-[#e3cba8] dark:bg-[#2a241e] rounded-xl">
              {/* Realistic wood floor background pattern */}
              <div className="absolute inset-0 z-0 opacity-30 mix-blend-multiply dark:opacity-10" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H0V20zM20 0h20v20H20V0z' fill='%238B4513' fill-opacity='0.2' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                  backgroundSize: '80px 80px'
              }} />
               <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/5 to-black/20 mix-blend-overlay pointer-events-none" />

              <ScrollArea className="h-full w-full z-10">
                 {/* Map Canvas */}
                 <div className="min-w-[600px] min-h-[500px] p-8 sm:p-12">
                     <div className="flex flex-wrap gap-x-16 gap-y-16 justify-start content-start">
                        {floorTables.length === 0 ? (
                          <div className="w-full flex h-60 items-center justify-center text-sm font-medium text-amber-950/60 dark:text-amber-100/40">
                            No tables placed on this floor yet.
                          </div>
                        ) : (
                          floorTables.map((table) => (
                            <RealisticTableWithChairs
                              key={table.id}
                              table={table}
                            />
                          ))
                        )}
                      </div>
                  </div>
              </ScrollArea>
            </Card>
          </Tabs>
        )}
      </div>
    </div>
  )
}

/* ---------------- Sub-components ---------------- */

/**
 * RealisticTableWithChairs renders:
 * - A smaller central table.
 * - Realistic chairs positioned around the table.
 * - The Popover trigger.
 */
function RealisticTableWithChairs({ table }: { table: Table }) {
  const statusStyles = tableStatusStylesReal(table.status)
  const isRound = table.capacity <= 4

  // Clamp seats for visual sanity
  const seatCount = Math.min(Math.max(table.capacity, 2), 10)
  const seats = Array.from({ length: seatCount })

  // Sizing for layout calculation
  const containerSize = 120 
  const tableSize = 60 
  const centerOffset = (containerSize - tableSize) / 2 
  const radius = tableSize / 2 + 18 

  return (
    <Popover>
       {/* Container defines the total footprint (table + chairs) */}
      <div className="relative flex-shrink-0" style={{ width: containerSize, height: containerSize }}>

        {/* Chairs (Rendered first to be underneath) */}
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

        {/* Central Table Trigger */}
      <PopoverTrigger asChild>
        <button
          type="button"
          style={{ top: centerOffset, left: centerOffset, width: tableSize, height: tableSize }}
          className={cn(
            "absolute group flex flex-col items-center justify-center transition-all hover:-translate-y-0.5 active:scale-95 z-10",
            isRound ? "rounded-full" : "rounded-lg",
            // Table Top: Light wood in light mode, Dark wood in dark mode
            "bg-gradient-to-br from-[#f3e4d0] to-[#dcbca0] dark:from-[#8b5a2b] dark:to-[#5c3a1e] border-[2px] shadow-md",
            statusStyles.border
          )}
        >
            {/* Hover Info Overlay */}
            <div className={cn(
              "absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 bg-black/10 backdrop-blur-[1px]",
                isRound ? "rounded-full" : "rounded-lg",
            )}>
                 <Info className={cn("h-4 w-4", statusStyles.textIcon)} />
            </div>

          {/* Table Label */}
          <div className="flex flex-col items-center gap-0 group-hover:opacity-0 transition-opacity duration-200">
            <span className="text-[11px] font-extrabold text-amber-950 dark:text-amber-100 leading-none">
                {table.name}
            </span>
          </div>
        </button>
      </PopoverTrigger>
      </div>

      {/* Updated Popover Content */}
      <PopoverContent 
        className="w-[90vw] max-w-[320px] p-0 overflow-hidden rounded-xl shadow-2xl border-border bg-card text-card-foreground" 
        align="center" 
        sideOffset={-20}
        collisionPadding={16}
      >
         <TableDetailsPopoverContent table={table} statusStyles={statusStyles} />
      </PopoverContent>
    </Popover>
  )
}

/**
 * Improved, Compact Popover Content
 */
function TableDetailsPopoverContent({ table, statusStyles }: { table: Table, statusStyles: any }) {
    
    // Mock data logic based on status
    const isOccupied = table.status === 'occupied' || table.status === 'reserved';
    const timeText = isOccupied ? "24m" : "-";
    const amountText = isOccupied ? "$42.50" : "-";

    return (
        <div className="flex flex-col bg-card">
            
            {/* 1. Header Section */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border">
                <div className="flex flex-col">
                    <h4 className="text-sm font-bold text-foreground">{table.name}</h4>
                    <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                        Code: {table.code}
                    </span>
                </div>
                <Badge variant="outline" className={cn("border-0 font-semibold capitalize", statusStyles.badgeCls)}>
                   {statusStyles.icon && <statusStyles.icon className="w-3 h-3 mr-1.5" />}
                   {table.status.replace("_", " ")}
                </Badge>
            </div>

            {/* 2. Quick Stats Grid */}
            <div className="p-3">
                <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-2 border border-dashed border-border">
                    <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-bold">
                            <Users className="w-3 h-3" /> Guests
                        </div>
                        <span className="text-sm font-semibold text-foreground">{table.capacity}</span>
                    </div>
                    
                    <Separator orientation="vertical" className="h-8 bg-border" />

                    <div className="flex flex-col items-center justify-center gap-1">
                         <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-bold">
                            <Clock className="w-3 h-3" /> Time
                        </div>
                        <span className="text-sm font-semibold text-foreground">{timeText}</span>
                    </div>

                    <Separator orientation="vertical" className="h-8 bg-border" />

                    <div className="flex flex-col items-center justify-center gap-1">
                         <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-bold">
                            <Receipt className="w-3 h-3" /> Total
                        </div>
                        <span className="text-sm font-semibold text-foreground">{amountText}</span>
                    </div>
                </div>
            </div>

            {/* 3. Action Buttons */}
            <div className="p-3 pt-0 flex flex-col gap-2">
                 {table.status === 'free' ? (
                      <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm h-9 text-xs sm:text-sm">
                        <Play className="w-3.5 h-3.5 mr-2 fill-current" />
                        Start New Order
                    </Button>
                 ) : table.status === 'needs_cleaning' ? (
                     <Button className="w-full border-border bg-background hover:bg-accent text-foreground h-9 text-xs sm:text-sm" variant="outline">
                         <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                         Mark as Cleaned
                     </Button>
                 ) : (
                    // Occupied
                    <div className="grid grid-cols-2 gap-2">
                         <Button variant="default" className="w-full h-9 text-xs sm:text-sm bg-primary text-primary-foreground hover:bg-primary/90">
                            <UtensilsCrossed className="w-3.5 h-3.5 mr-2" />
                            Add Items
                        </Button>
                         <Button variant="secondary" className="w-full h-9 text-xs sm:text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80">
                            Payment
                        </Button>
                    </div>
                 )}
                 
                 {/* Secondary utility links */}
                 <div className="flex items-center justify-between pt-2 px-1">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground">
                        <ChefHat className="w-3 h-3 mr-1.5" />
                        KDS Status
                    </Button>
                    {table.status !== 'free' && (
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-3 h-3 mr-1.5" />
                            Cancel
                        </Button>
                    )}
                 </div>
            </div>
        </div>
    )
}


/* ---------------- Helpers ---------------- */

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
        border: "border-slate-400/60 dark:border-slate-500",
        textIcon: "text-slate-600 dark:text-slate-300",
        dotBg: "bg-slate-400",
        badgeCls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
        icon: AlertCircle
      }
    default:
      return {
         border: "border-border", textIcon: "text-muted-foreground", dotBg: "bg-muted",
         badgeCls: "bg-muted text-muted-foreground", icon: Info
      }
  }
}