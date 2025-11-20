// src/pages/Dashboard.tsx
"use client"

import React, { useEffect, useState } from "react"
import {
  TrendingUp,
  ShoppingCart,
  Users,
  Activity,
  AlertCircle,
  BarChart3,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import {
  fetchDashboardOverview,
  type DashboardOverview,
  type DashboardTimeframe,
  revenueChartConfig,
  ordersChartConfig,
} from "@/api/dashboard"

import { cn } from "@/lib/utils"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { TooltipProvider } from "@/components/ui/tooltip"
import { toast } from "sonner"

type LoadingState = "idle" | "loading" | "success" | "error"

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState<DashboardTimeframe>("today")
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [state, setState] = useState<LoadingState>("idle")

  useEffect(() => {
    let mounted = true

    async function load() {
      setState("loading")
      try {
        const data = await fetchDashboardOverview(timeframe)
        if (!mounted) return
        setOverview(data)
        setState("success")
      } catch (err: any) {
        if (!mounted) return
        setState("error")
        toast("Failed to load dashboard")
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [timeframe])

  const currency = overview?.currency ?? "KES"
  const hasStaffPerformance =
    overview?.staff_performance &&
    ((overview.staff_performance?.waiters?.length ?? 0) > 0 ||
      (overview.staff_performance?.cashiers?.length ?? 0) > 0)

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 pb-6 lg:pb-8">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Restaurant Dashboard
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Real-time overview of sales, orders, staff performance and floor
              occupancy across your restaurant.
            </p>
          </div>

          <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Tabs
              value={timeframe}
              onValueChange={(value) => setTimeframe(value as DashboardTimeframe)}
              className="w-full max-w-md sm:w-auto"
            >
              <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:grid-cols-4">
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="year">Year</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Content */}
        {state === "loading" && <DashboardSkeleton />}

        {state === "error" && !overview && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <CardTitle className="text-base">
                  Unable to load dashboard
                </CardTitle>
                <CardDescription>
                  Please check your connection and try again.
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        )}

        {overview && state !== "loading" && (
          <>
            {/* Top metrics */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total revenue"
                value={formatCurrency(overview.metrics.total_revenue, currency)}
                icon={TrendingUp}
                hint={timeframeLabel(overview.timeframe)}
              />
              <MetricCard
                label="Total orders"
                value={overview.metrics.total_orders.toLocaleString()}
                icon={ShoppingCart}
                hint="Includes dine-in, takeaway & online"
              />
              <MetricCard
                label="Average order value"
                value={formatCurrency(
                  overview.metrics.average_order_value,
                  currency
                )}
                icon={Activity}
                hint="Revenue ÷ orders"
              />
              <MetricCard
                label="Active orders"
                value={overview.metrics.active_orders.toString()}
                icon={Users}
                hint="Orders not yet completed"
              />
            </div>

            {/* Charts row */}
            <div className="grid gap-4 lg:grid-cols-5">
              {/* Revenue trend */}
              <Card className="lg:col-span-3">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-base">Revenue trend</CardTitle>
                    <CardDescription>
                      {timeframe === "today"
                        ? "Revenue by hour"
                        : "Revenue over the selected period"}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {timeframeLabel(timeframe)}
                  </Badge>
                </CardHeader>
                <CardContent className="h-64 sm:h-72">
                  {overview.revenue_series.length === 0 ? (
                    <EmptyChartState />
                  ) : (
                    <ChartContainer
                      config={revenueChartConfig}
                      className="h-full w-full rounded-md border bg-background/40 p-2 sm:p-3"
                    >
                      <AreaChart data={overview.revenue_series}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(v) => shortCurrency(v, currency)}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value) =>
                                formatCurrency(value as number, currency)
                              }
                            />
                          }
                        />
                        <Area
                          type="monotone"
                          dataKey="total"
                          name={revenueChartConfig.total.label}
                          stroke="var(--color-total, hsl(var(--chart-1)))"
                          fill="var(--color-total, hsl(var(--chart-1)))"
                          fillOpacity={0.15}
                          strokeWidth={2}
                          activeDot={{ r: 4 }}
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                      </AreaChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* Orders mix */}
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-base">Orders mix</CardTitle>
                    <CardDescription>
                      Dine-in vs takeaway vs online for this period
                    </CardDescription>
                  </div>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="h-64 sm:h-72">
                  {overview.orders_series.length === 0 ? (
                    <EmptyChartState />
                  ) : (
                    <ChartContainer
                      config={ordersChartConfig}
                      className="h-full w-full rounded-md border bg-background/40 p-2 sm:p-3"
                    >
                      <BarChart data={overview.orders_series}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value) =>
                                (value as number).toLocaleString()
                              }
                            />
                          }
                        />
                        <Bar
                          dataKey="dine_in"
                          stackId="orders"
                          name={ordersChartConfig.dine_in.label}
                          fill="var(--color-dine_in, hsl(var(--chart-2)))"
                        />
                        <Bar
                          dataKey="online"
                          stackId="orders"
                          name={ordersChartConfig.online.label}
                          fill="var(--color-online, hsl(var(--chart-3)))"
                        />
                        <Bar
                          dataKey="takeaway"
                          stackId="orders"
                          name={ordersChartConfig.takeaway.label}
                          fill="var(--color-takeaway, hsl(var(--chart-4)))"
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Middle row: status/payments + staff performance (if any) */}
            <div className="grid gap-4 xl:grid-cols-2">
              {/* Orders & payments */}
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-base">Orders & payments</CardTitle>
                  <CardDescription>Status and payment breakdown</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs font-medium">
                      <span>Orders by status</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      {renderStatusRow(
                        "Pending",
                        overview.orders_by_status.pending,
                        overview.metrics.total_orders
                      )}
                      {renderStatusRow(
                        "In progress",
                        overview.orders_by_status.in_progress,
                        overview.metrics.total_orders
                      )}
                      {renderStatusRow(
                        "Ready",
                        overview.orders_by_status.ready,
                        overview.metrics.total_orders
                      )}
                      {renderStatusRow(
                        "Served",
                        overview.orders_by_status.served,
                        overview.metrics.total_orders
                      )}
                      {renderStatusRow(
                        "Completed",
                        overview.orders_by_status.completed,
                        overview.metrics.total_orders
                      )}
                      {renderStatusRow(
                        "Cancelled",
                        overview.orders_by_status.cancelled,
                        overview.metrics.total_orders,
                        "bg-destructive/40"
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs font-medium">
                      <span>Payment breakdown</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      {renderPaymentRow(
                        "Paid",
                        overview.payment_breakdown.paid,
                        "bg-emerald-500"
                      )}
                      {renderPaymentRow(
                        "Partial",
                        overview.payment_breakdown.partial,
                        "bg-amber-500"
                      )}
                      {renderPaymentRow(
                        "Unpaid",
                        overview.payment_breakdown.unpaid,
                        "bg-muted-foreground"
                      )}
                      {renderPaymentRow(
                        "Refunded",
                        overview.payment_breakdown.refunded,
                        "bg-sky-500"
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Staff performance (only if owner/manager data present) */}
              {hasStaffPerformance && overview.staff_performance && (
                <Card>
                  <CardHeader className="flex flex-col gap-2 space-y-0 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Staff performance
                      </CardTitle>
                      <CardDescription>
                        Waiter & cashier performance over this period
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="w-fit text-[11px]">
                      Owner / Manager only
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Tabs defaultValue="waiters" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                        <TabsTrigger value="waiters">Waiters</TabsTrigger>
                        <TabsTrigger value="cashiers">Cashiers</TabsTrigger>
                      </TabsList>

                      {/* Waiters */}
                      <TabsContent value="waiters" className="mt-3">
                        {overview.staff_performance.waiters.length === 0 ? (
                          <EmptyTableState label="No waiter activity for this period." />
                        ) : (
                          <ScrollArea className="h-[230px]">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Name</TableHead>
                                  <TableHead className="hidden sm:table-cell">
                                    Orders
                                  </TableHead>
                                  <TableHead className="hidden lg:table-cell">
                                    Active
                                  </TableHead>
                                  <TableHead className="hidden lg:table-cell">
                                    Completed
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Revenue
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {overview.staff_performance.waiters.map((w) => (
                                  <TableRow key={w.id}>
                                    <TableCell className="font-medium">
                                      {w.name}
                                    </TableCell>
                                    <TableCell className="hidden text-xs sm:table-cell">
                                      {w.total_orders}
                                    </TableCell>
                                    <TableCell className="hidden text-xs lg:table-cell">
                                      {w.active_orders}
                                    </TableCell>
                                    <TableCell className="hidden text-xs lg:table-cell">
                                      {w.completed_orders}
                                    </TableCell>
                                    <TableCell className="text-right text-xs">
                                      {formatCurrency(
                                        w.total_revenue,
                                        currency
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        )}
                      </TabsContent>

                      {/* Cashiers */}
                      <TabsContent value="cashiers" className="mt-3">
                        {overview.staff_performance.cashiers.length === 0 ? (
                          <EmptyTableState label="No cashier activity for this period." />
                        ) : (
                          <ScrollArea className="h-[230px]">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Name</TableHead>
                                  <TableHead className="hidden sm:table-cell">
                                    Payments
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Processed
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {overview.staff_performance.cashiers.map(
                                  (c) => (
                                    <TableRow key={c.id}>
                                      <TableCell className="font-medium">
                                        {c.name}
                                      </TableCell>
                                      <TableCell className="hidden text-xs sm:table-cell">
                                        {c.payments_count}
                                      </TableCell>
                                      <TableCell className="text-right text-xs">
                                        {formatCurrency(
                                          c.total_processed,
                                          currency
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  )
                                )}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Bottom row: top products + occupancy + recent orders */}
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
              {/* Top products */}
              <Card className="2xl:col-span-1">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-base">Top products</CardTitle>
                  <CardDescription>
                    Most ordered items in this period
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {overview.top_products.length === 0 ? (
                    <EmptyTableState label="No products found for this period." />
                  ) : (
                    <ScrollArea className="h-[260px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="hidden sm:table-cell">
                              Category
                            </TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">
                              Revenue
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {overview.top_products.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-medium">
                                {p.name}
                              </TableCell>
                              <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                                {p.category}
                              </TableCell>
                              <TableCell className="text-right text-xs">
                                {p.total_quantity.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right text-xs">
                                {formatCurrency(p.total_revenue, currency)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Occupancy */}
              <Card className="2xl:col-span-1">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-base">Floor occupancy</CardTitle>
                  <CardDescription>
                    Realtime snapshot by floor plan
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span>Overall occupancy</span>
                      <span>{overview.metrics.occupancy_rate.toFixed(0)}%</span>
                    </div>
                    <Progress value={overview.metrics.occupancy_rate} />
                  </div>

                  <ScrollArea className="h-[210px]">
                    <div className="space-y-3 text-xs">
                      {overview.floor_plans.length === 0 && (
                        <p className="text-muted-foreground">
                          No floor plans configured yet.
                        </p>
                      )}

                      {overview.floor_plans.map((fp) => {
                        const used = fp.occupied_tables + fp.reserved_tables
                        const total = fp.total_tables || 1
                        const rate = (used / total) * 100

                        return (
                          <div
                            key={fp.id}
                            className="space-y-1 rounded-md border bg-card px-3 py-2"
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{fp.name}</p>
                              <span className="text-[11px] text-muted-foreground">
                                {used}/{fp.total_tables} tables active
                              </span>
                            </div>
                            <Progress value={rate} />
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>Occupied: {fp.occupied_tables}</span>
                              <span>Reserved: {fp.reserved_tables}</span>
                              <span>
                                Needs cleaning: {fp.needs_cleaning_tables}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Recent orders */}
              <Card className="lg:col-span-2 2xl:col-span-2">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-base">Recent orders</CardTitle>
                  <CardDescription>
                    Last 10 orders in this restaurant
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ScrollArea className="h-[260px]">
                    <div className="space-y-2 text-xs">
                      {overview.recent_orders.length === 0 && (
                        <p className="text-muted-foreground">
                          No recent orders found.
                        </p>
                      )}

                      {overview.recent_orders.map((o) => (
                        <div
                          key={o.id}
                          className="flex flex-col gap-2 rounded-md border bg-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">
                                #{o.code ?? o.id}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] uppercase"
                              >
                                {o.status}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {o.table_name ?? "No table"}
                              {o.waiter_name && <> · {o.waiter_name}</>}
                              {o.client_name && <> · {o.client_name}</>}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {formatDateTime(o.opened_at)}
                            </p>
                          </div>
                          <div className="flex flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
                            <span className="text-xs font-semibold">
                              {formatCurrency(o.total, currency)}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] uppercase",
                                paymentBadgeClass(o.payment_status)
                              )}
                            >
                              {o.payment_status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  )
}

/* ----------------- Sub-components & helpers ----------------- */

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx}>
            <CardHeader className="space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-56 w-full" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, idx) => (
          <Card key={idx}>
            <CardHeader className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-56 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx}>
            <CardHeader className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-56 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

type MetricCardProps = {
  label: string
  value: string
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  hint?: string
}

function MetricCard({ label, value, icon: Icon, hint }: MetricCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-xs font-medium text-muted-foreground">
            {label}
          </CardTitle>
        </div>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight">
            {value}
          </span>
        </div>
        {hint && (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyChartState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
      <span>No data available for this period.</span>
      <span>Try changing the timeframe.</span>
    </div>
  )
}

function EmptyTableState({ label }: { label: string }) {
  return <p className="text-xs text-muted-foreground">{label}</p>
}

function renderStatusRow(
  label: string,
  count: number,
  total: number,
  barClass?: string
) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="space-y-1" key={label}>
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <span>
          {count} · {pct.toFixed(0)}%
        </span>
      </div>
      <Progress value={pct} className={barClass} />
    </div>
  )
}

function renderPaymentRow(label: string, count: number, dotClass: string) {
  return (
    <div className="flex items-center justify-between gap-2" key={label}>
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", dotClass)} />
        <span>{label}</span>
      </div>
      <span>{count}</span>
    </div>
  )
}

function timeframeLabel(tf: DashboardTimeframe): string {
  switch (tf) {
    case "today":
      return "Today"
    case "week":
      return "Last 7 days"
    case "month":
      return "This month"
    case "year":
      return "This year"
    default:
      return ""
  }
}

function formatCurrency(amount: number, currency: string): string {
  if (!Number.isFinite(amount)) return "-"
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function shortCurrency(amount: number, currency: string): string {
  if (!Number.isFinite(amount)) return "-"
  const abs = Math.abs(amount)

  if (abs >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`
  }
  if (abs >= 1_000) {
    return `${(amount / 1_000).toFixed(1)}K`
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function paymentBadgeClass(status: string): string {
  const s = status.toLowerCase()
  if (s === "paid") return "border-emerald-500/40 text-emerald-600"
  if (s === "partial") return "border-amber-500/40 text-amber-600"
  if (s === "refunded") return "border-sky-500/40 text-sky-600"
  if (s === "unpaid") return "border-muted-foreground/40 text-muted-foreground"
  return ""
}
