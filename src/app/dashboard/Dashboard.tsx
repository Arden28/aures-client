"use client"

import React, { useEffect, useState } from "react"
import {
  TrendingUp,
  ShoppingCart,
  Users,
  Activity,
  AlertCircle,
  BarChart3,
  UtensilsCrossed,
  Clock,
  Sun,
  Moon,
  RefreshCw,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Cell,
  LabelList
} from "recharts"

import {
  fetchDashboardOverview,
  type DashboardOverview,
  type DashboardTimeframe,
} from "@/api/dashboard"

import { cn, formatMoney } from "@/lib/utils"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { TooltipProvider } from "@/components/ui/tooltip"
import { toast } from "sonner"
import useAuth from "@/hooks/useAuth"

type LoadingState = "idle" | "initial-loading" | "revalidating" | "success" | "error"

export default function Dashboard() {
  const { user } = useAuth()
  const [timeframe, setTimeframe] = useState<DashboardTimeframe>("today")
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [state, setState] = useState<LoadingState>("idle")
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Role Logic
  const role = (user as any)?.role || "waiter"
  const isManagerial = ["owner", "manager"].includes(role)
  const isKitchen = role === "kitchen"
  const isCashier = role === "cashier"

  // Data Fetching
  const fetchData = async (isBackground = false) => {
    if (!isBackground) setState("initial-loading")
    else setState("revalidating")

    try {
      const data = await fetchDashboardOverview(timeframe)
      setOverview(data)
      setLastUpdated(new Date())
      setState("success")
    } catch (err: any) {
      if (!isBackground) setState("error")
    }
  }

  useEffect(() => { fetchData(false) }, [timeframe])

  useEffect(() => {
    const interval = setInterval(() => { fetchData(true) }, 15000) 
    return () => clearInterval(interval)
  }, [timeframe])

  // UX Helpers
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return { text: "Good morning", icon: Sun }
    if (hour < 18) return { text: "Good afternoon", icon: Sun }
    return { text: "Good evening", icon: Moon }
  }

  const { text: greeting, icon: GreetingIcon } = getGreeting()
  const currency = overview?.currency ?? "KES"
  
  const hasStaffPerformanceData = overview?.staff_performance && 
    ((overview.staff_performance?.waiters?.length ?? 0) > 0 || (overview.staff_performance?.cashiers?.length ?? 0) > 0)

  // Chart Colors (Synced with CSS variables)
  const colors = {
    primary: "hsl(var(--primary))",
    muted: "hsl(var(--muted-foreground))",
    grid: "hsl(var(--border))",
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-8 pb-8 animate-in fade-in duration-500">
        
        {/* --- Header --- */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-muted-foreground">
               <GreetingIcon className="h-4 w-4 text-orange-500" />
               <span className="text-sm font-medium uppercase tracking-wider">{greeting}, {user?.name}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {isManagerial ? "Business Overview" : `${role.charAt(0).toUpperCase() + role.slice(1)} Dashboard`}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-600 font-medium">Live Updates Active</span>
                <span className="text-xs text-muted-foreground/60">• Last updated {lastUpdated.toLocaleTimeString()}</span>
            </div>
          </div>


          <div className="flex items-center gap-3">
             {state === 'revalidating' && (
                 <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
             )}
            <Tabs
              value={timeframe}
              onValueChange={(value) => setTimeframe(value as DashboardTimeframe)}
              className="w-full sm:w-auto"
            >
              <TabsList className="bg-muted/50 p-1">
                {['today', 'week', 'month', 'year'].map((t) => (
                    <TabsTrigger 
                        key={t} 
                        value={t} 
                        className="capitalize data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                    >
                        {t}
                    </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* --- Loading / Error States --- */}
        {state === "initial-loading" && <DashboardSkeleton />}

        {state === "error" && !overview && (
          <div className="flex flex-col items-center justify-center h-64 border border-dashed rounded-xl bg-muted/20">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Unable to load data</p>
              <Button variant="link" onClick={() => fetchData(false)} size="sm">Retry</Button>
          </div>
        )}

        {/* --- Main Dashboard Content --- */}
        {overview && (state === "success" || state === "revalidating") && (
          <div className="space-y-8">
            
            {/* 1. Metric Cards (KPIs) */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              
              {isManagerial && (
                <>
                  <MetricCard
                    label="Total Revenue"
                    value={overview.metrics.total_revenue}
                    currency={currency}
                    icon={Wallet}
                    trend="up" // Logic to calculate this needed in backend
                    percentage={12} // Logic needed
                  />
                   <MetricCard
                    label="Avg. Order Value"
                    value={overview.metrics.average_order_value}
                    currency={currency}
                    icon={Activity}
                  />
                </>
              )}

              <MetricCard
                label="Total Orders"
                value={overview.metrics.total_orders}
                icon={ShoppingCart}
              />
              
              <MetricCard
                label="Active Pipeline"
                value={overview.metrics.active_orders}
                icon={Clock}
                alert={overview.metrics.active_orders > 10} // Alert if busy
              />

              {!isManagerial && (
                 <MetricCard
                 label="Completed"
                 value={overview.metrics.completed_today}
                 icon={UtensilsCrossed}
               />
              )}
            </div>

            {/* 2. Primary Charts (Manager) */}
            {isManagerial && (
              <div className="grid gap-4 lg:grid-cols-7">
                
                {/* Revenue Area Chart */}
                <Card className="lg:col-span-4 shadow-none border-border/60 bg-card/50">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Revenue Trend</CardTitle>
                    <CardDescription className="text-xs">Income over {timeframe}</CardDescription>
                  </CardHeader>
                  <CardContent className="pl-0 pb-0">
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={overview.revenue_series} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={colors.primary} stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor={colors.primary} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis 
                                    dataKey="label" 
                                    stroke={colors.muted} 
                                    fontSize={11} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tickMargin={12}
                                />
                                <YAxis 
                                    stroke={colors.muted} 
                                    fontSize={11} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tickFormatter={(value) => shortCurrency(value, currency)} 
                                />
                                <Tooltip content={<CustomTooltip currency={currency} />} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} opacity={0.4} />
                                <Area 
                                    type="monotone" 
                                    dataKey="total" 
                                    stroke={colors.primary} 
                                    strokeWidth={2.5}
                                    fillOpacity={1} 
                                    fill="url(#colorRevenue)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>


              {/* Occupancy */}
              {!isKitchen && (
                <Card className={cn("shadow-none border-border/60", isManagerial ? "lg:col-span-3" : "lg:col-span-3")}>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Occupancy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center py-6">
                        <div className="relative flex items-center justify-center h-32 w-32">
                             <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                                <path className="text-muted/20" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                <path className="text-primary transition-all duration-1000 ease-out" strokeDasharray={`${overview.metrics.occupancy_rate}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                             </svg>
                             <div className="absolute flex flex-col items-center">
                                <span className="text-3xl font-bold">{overview.metrics.occupancy_rate.toFixed(0)}%</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Capacity</span>
                             </div>
                        </div>
                    </div>
                    
                    <div className="space-y-4 mt-2">
                        {overview.floor_plans.map(fp => (
                            <div key={fp.id} className="space-y-1.5">
                                <div className="flex justify-between text-xs font-medium">
                                    <span>{fp.name}</span>
                                    <span className="text-muted-foreground">{fp.occupied_tables + fp.reserved_tables}/{fp.total_tables}</span>
                                </div>
                                <div className="flex gap-0.5 h-1.5 w-full rounded-full overflow-hidden bg-muted">
                                    <div style={{ width: `${(fp.occupied_tables / fp.total_tables) * 100}%` }} className="bg-primary" />
                                    <div style={{ width: `${(fp.reserved_tables / fp.total_tables) * 100}%` }} className="bg-amber-400" />
                                    <div style={{ width: `${(fp.needs_cleaning_tables / fp.total_tables) * 100}%` }} className="bg-blue-400" />
                                </div>
                            </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
                {/* Orders Bar Chart */}
                {/* <Card className="lg:col-span-3 shadow-none border-border/60 bg-card/50">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Order Sources</CardTitle>
                    <CardDescription className="text-xs">Dine-in vs Online vs Takeaway</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={overview.orders_series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={32}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} opacity={0.4} />
                                <XAxis dataKey="label" stroke={colors.muted} fontSize={11} tickLine={false} axisLine={false} tickMargin={10} />
                                <YAxis stroke={colors.muted} fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{fill: 'var(--muted)', opacity: 0.1}} content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                                <Bar dataKey="dine_in" name="Dine-in" stackId="a" fill="hsl(var(--chart-2))" radius={[0, 0, 4, 4]} />
                                <Bar dataKey="takeaway" name="Takeaway" stackId="a" fill="hsl(var(--chart-4))" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="online" name="Online" stackId="a" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card> */}
              </div>
            )}

            {/* 3. Operational Details */}
            <div className={cn("grid gap-4", isManagerial ? "xl:grid-cols-2" : "grid-cols-1")}>
              
              {isManagerial && overview.operational_efficiency && (
                 <ServiceVelocityCard efficiency={overview.operational_efficiency} />
              )}
              
              {/* Order Status Pipeline */}
              <Card className="shadow-none border-border/60">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold">Live Operations</CardTitle>
                    <CardDescription className="text-xs">Current kitchen & payment status</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                    {/* Pipeline */}
                    <div className="space-y-4">
                        <StatusRow 
                            label="Pending Confirmation" 
                            count={overview.orders_by_status.pending} 
                            total={overview.metrics.total_orders} 
                            colorClass="bg-orange-500" 
                        />
                        <StatusRow 
                            label="Cooking / Preparing" 
                            count={overview.orders_by_status.PREPARING} 
                            total={overview.metrics.total_orders} 
                            colorClass="bg-blue-500" 
                        />
                        <StatusRow 
                            label="Ready to Serve" 
                            count={overview.orders_by_status.ready} 
                            total={overview.metrics.total_orders} 
                            colorClass="bg-purple-500" 
                        />
                    </div>
                    
                    <Separator />
                    
                    {/* Financial Summary */}
                    {(isManagerial || isCashier) && (
                        <div className="grid grid-cols-3 gap-4 pt-2">
                            <FinanceStat label="Paid" value={overview.payment_breakdown.paid} color="text-emerald-600" />
                            <FinanceStat label="Open" value={overview.payment_breakdown.unpaid} color="text-muted-foreground" />
                            <FinanceStat label="Void" value={overview.payment_breakdown.refunded} color="text-red-500" />
                        </div>
                    )}
                </CardContent>
              </Card>

              {/* Staff Activity */}
              {isManagerial && hasStaffPerformanceData && (
                <Card className="shadow-none border-border/60 flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Staff Activity</CardTitle>
                    <CardDescription className="text-xs">Performance leaders</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-[300px]">
                    <Tabs defaultValue="waiters" className="w-full h-full flex flex-col">
                      <TabsList className="grid w-full grid-cols-2 bg-muted/40 p-1 mb-4">
                        <TabsTrigger value="waiters" className="text-xs">Waiters</TabsTrigger>
                        <TabsTrigger value="cashiers" className="text-xs">Cashiers</TabsTrigger>
                      </TabsList>
                      
                      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <TabsContent value="waiters" className="mt-0 space-y-3">
{overview.staff_performance!.waiters.map((w, index) => {
    // Calculate max revenue to normalize the bar
    const maxRev = overview.staff_performance!.waiters[0].total_revenue || 1; 
    const percentage = (w.total_revenue / maxRev) * 100;

    return (
        <div key={w.id} className="relative flex items-center justify-between group p-2 rounded-lg hover:bg-muted/40 transition-all">
            {/* Background Bar for Visual Impact */}
            <div 
                className="absolute left-0 top-0 bottom-0 bg-primary/5 rounded-lg transition-all duration-500" 
                style={{ width: `${percentage}%` }} 
            />

            <div className="relative flex items-center gap-3 z-10">
                <div className="h-8 w-8 rounded-full bg-background border flex items-center justify-center font-bold text-xs shadow-sm">
                    {w.name.charAt(0)}
                </div>
                <div>
                    <p className="text-sm font-medium leading-none">{w.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[9px] h-4 px-1 py-0">{w.completed_orders} orders</Badge>
                        <span className="text-[10px] text-muted-foreground">Avg: {formatMoney(w.average_order_value, currency)}</span>
                    </div>
                </div>
            </div>
            
            <div className="relative text-right z-10">
                <p className="text-sm font-bold">{formatMoney(w.total_revenue, currency)}</p>
                {/* Highlight top performer */}
                {index === 0 && <p className="text-[9px] text-emerald-600 font-medium">Top Performer</p>}
            </div>
        </div>
    )
})}
                        </TabsContent>
                        <TabsContent value="cashiers" className="mt-0 space-y-3">
                            {overview.staff_performance!.cashiers.map((c) => (
                                <div key={c.id} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            {c.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{c.name}</p>
                                            <p className="text-[10px] text-muted-foreground">{c.payments_count} transactions</p>
                                        </div>
                                    </div>
                                    <p className="text-sm font-bold text-foreground">{formatMoney(c.total_processed, currency)}</p>
                                </div>
                            ))}
                        </TabsContent>
                      </div>
                    </Tabs>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 4. Bottom Row: Recent Orders Feed & Top Products */}
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
              
              {/* Top Products */}
              {isManagerial && (
                <Card className="2xl:col-span-1 shadow-none border-border/60">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Top Selling</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[320px]">
                        <div className="divide-y divide-border/30">
                            {overview.top_products.map((p, i) => (
                                <div key={p.id} className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold text-muted-foreground/60 w-4">0{i+1}</span>
                                        <div>
                                            <p className="text-sm font-medium leading-none">{p.name}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase mt-1">{p.category}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold">{p.total_quantity}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Feed */}
              <Card className={cn("shadow-none border-border/60", isManagerial ? "2xl:col-span-2 lg:col-span-2" : "2xl:col-span-3 lg:col-span-1")}>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Latest Activity</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[320px]">
                        <div className="divide-y divide-border/30">
                            {overview.recent_orders.length === 0 ? <div className="p-4 text-center text-xs text-muted-foreground">No recent activity</div> : (
                                overview.recent_orders.map(o => (
                                    <div key={o.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-medium text-foreground">#{o.code || o.id}</span>
                                                <span className="text-xs font-semibold text-foreground">{o.table_name || "Takeout"}</span>
                                            </div>
                                            <div className="text-[10px] text-muted-foreground flex gap-1">
                                                <span>{formatDateTime(o.opened_at)}</span>
                                                {o.waiter_name && <span>• {o.waiter_name.split(' ')[0]}</span>}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-muted text-muted-foreground hover:bg-muted">
                                                {o.status}
                                            </Badge>
                                            {(isManagerial || isCashier) && (
                                                <span className="text-xs font-bold w-14 text-right tabular-nums">{formatMoney(o.total, currency)}</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
              </Card>

            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

/* --- Refined Sub-Components --- */

function MetricCard({ label, value, currency, icon: Icon, trend, trendUp, alert, percentage }: any) {
    const formattedValue = typeof value === 'number' ? 
        (currency ? formatCurrency(value, currency) : value.toLocaleString()) : value;

    return (
        <Card className={cn(
            "shadow-none border-border/60 relative overflow-hidden transition-all hover:bg-muted/20",
            alert && "border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-900/10"
        )}>
            <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground/50" />}
                </div>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold tracking-tight text-foreground">{formattedValue}</h3>
                </div>
                {trend && (
                    <div className="flex items-center gap-1 mt-2">
                        {trendUp ? <ArrowUpRight className="h-3 w-3 text-emerald-500" /> : <ArrowDownRight className="h-3 w-3 text-red-500" />}
                        <span className={cn("text-xs font-medium", trendUp ? "text-emerald-600" : "text-red-600")}>
                            {percentage}% <span className="text-muted-foreground font-normal">vs last period</span>
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function StatusRow({ label, count, total, colorClass }: any) {
  const pct = total > 0 ? (count / total) * 100 : 0

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{count}</span>
      </div>

      <Progress
        value={pct}
        className={`h-1.5 [&>div]:${colorClass}`}
      />
    </div>
  )
}


// Service Velocity Component
function ServiceVelocityCard({ efficiency }: { efficiency: any }) {
    if (!efficiency) return null;

    const data = [
        { name: "Reaction", minutes: efficiency.avg_wait_mins, color: "hsl(var(--chart-1))", desc: "Order → Kitchen" },
        { name: "Prep Time", minutes: efficiency.avg_prep_mins, color: "hsl(var(--chart-2))", desc: "Kitchen → Ready" },
        { name: "Pickup", minutes: efficiency.avg_serve_mins, color: "hsl(var(--chart-3))", desc: "Ready → Table" },
    ];

    return (
        <Card className="shadow-none border-border/60">
            <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Service Velocity
                </CardTitle>
                <CardDescription className="text-xs">Average time (minutes) per stage</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.5} />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} 
                                width={70}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip 
                                cursor={{ fill: 'transparent' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload;
                                        return (
                                            <div className="bg-popover border border-border px-3 py-2 rounded-lg shadow-lg text-xs">
                                                <p className="font-bold mb-1">{d.name}</p>
                                                <p className="text-muted-foreground">{d.desc}</p>
                                                <p className="text-lg font-bold mt-1">{d.minutes} <span className="text-xs font-normal text-muted-foreground">mins</span></p>
                                            </div>
                                        )
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="minutes" radius={[0, 4, 4, 0]} barSize={32}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                                <LabelList dataKey="minutes" position="right" fontSize={11} fontWeight="bold" formatter={(val: number) => val + "m"} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                
                <div className="mt-4 grid grid-cols-3 text-center divide-x divide-border/50">
                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Reaction</p>
                        <p className="text-sm font-bold">{efficiency.avg_wait_mins}m</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Cooking</p>
                        <p className="text-sm font-bold">{efficiency.avg_prep_mins}m</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Pickup</p>
                        <p className="text-sm font-bold">{efficiency.avg_serve_mins}m</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function FinanceStat({ label, value, color }: any) {
    return (
        <div className="text-center p-2 rounded bg-muted/30">
            <div className="text-[10px] uppercase text-muted-foreground mb-0.5">{label}</div>
            <div className={cn("text-lg font-bold", color)}>{value}</div>
        </div>
    )
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
            <div className="grid gap-4 lg:grid-cols-5">
                <Skeleton className="h-[320px] lg:col-span-3 rounded-xl" />
                <Skeleton className="h-[320px] lg:col-span-2 rounded-xl" />
            </div>
        </div>
    )
}

const CustomTooltip = ({ active, payload, label, currency }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-md border border-border px-3 py-2 rounded-lg shadow-lg text-xs">
          <p className="font-medium mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-muted-foreground">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
                <span className="font-bold text-foreground">
                    {currency ? formatMoney(entry.value, currency) : entry.value}
                </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
};

// Helpers
function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

function shortCurrency(amount: number, currency: string) {
    if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return (amount / 1000).toFixed(1) + 'k';
    return amount.toString();
}

function formatDateTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}