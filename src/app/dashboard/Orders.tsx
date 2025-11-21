// src/app/orders/Orders.tsx
"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import {
  MoreHorizontal,
  Eye,
  Trash2,
  Receipt,
  User,
  Table2,
  UtensilsCrossed,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { DataTable } from "@/components/data-table"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"

import type {
  Order,
  OrderStatusValue,
  PaymentStatusValue,
} from "@/api/order"
import { fetchOrders, updateOrder, deleteOrder } from "@/api/order"

type LoadingState = "idle" | "loading" | "success" | "error"

type OrderFormState = {
  discount_amount: string
}

const ORDER_STATUSES: OrderStatusValue[] = [
  "pending",
  "in_progress",
  "ready",
  "served",
  "completed",
  "cancelled",
]

const PAYMENT_STATUSES: PaymentStatusValue[] = [
  "unpaid",
  "partial",
  "paid",
  "refunded",
]

export default function Orders() {
  const [data, setData] = React.useState<Order[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [state, setState] = React.useState<LoadingState>("idle")

  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | OrderStatusValue
  >("all")
  const [paymentFilter, setPaymentFilter] = React.useState<
    "all" | PaymentStatusValue
  >("all")

  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [dialogMode] = React.useState<"view" | "edit">("edit") // for now edit discount only
  const [editingOrder, setEditingOrder] = React.useState<Order | null>(null)
  const [form, setForm] = React.useState<OrderFormState>({
    discount_amount: "",
  })
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(async () => {
    setIsLoading(true)
    setState("loading")
    try {
      const filters: { status?: OrderStatusValue; per_page?: number } = {
        per_page: 100,
      }
      if (statusFilter !== "all") {
        filters.status = statusFilter
      }

      const { items } = await fetchOrders(filters)
      setData(items)
      setState("success")
    } catch (err) {
      console.error(err)
      toast.error("Failed to load orders.")
      setState("error")
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  React.useEffect(() => {
    load()
  }, [load])

  const filteredData = React.useMemo(() => {
    const q = search.trim().toLowerCase()

    return data.filter((order) => {
      if (paymentFilter !== "all" && order.payment_status !== paymentFilter) {
        return false
      }

      if (!q) return true

      const code = `#${order.id}`.toLowerCase()
      const table = order.table?.name?.toLowerCase() ?? ""
      const waiter = order.waiter?.name?.toLowerCase() ?? ""
      const client = order.client?.name?.toLowerCase() ?? ""
      const status = order.status.toLowerCase()
      const payment = order.payment_status.toLowerCase()

      return (
        code.includes(q) ||
        table.includes(q) ||
        waiter.includes(q) ||
        client.includes(q) ||
        status.includes(q) ||
        payment.includes(q)
      )
    })
  }, [data, search, paymentFilter])

  function handleSearchChange(value: string) {
    setSearch(value)
  }

  const openEditDialog = React.useCallback((order: Order) => {
    setEditingOrder(order)
    setForm({
      discount_amount:
        order.discount_amount != null ? String(order.discount_amount) : "0",
    })
    setIsDialogOpen(true)
  }, [])

  const handleDelete = React.useCallback(
    async (order: Order) => {
      if (!confirm(`Delete order #${order.id}?`)) return
      try {
        await deleteOrder(order.id)
        toast.success("Order deleted.")
        await load()
      } catch (err) {
        console.error(err)
        toast.error("Failed to delete order.")
      }
    },
    [load]
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingOrder) return

    setSaving(true)
    try {
      const discount = parseFloat(form.discount_amount || "0")
      const payload = {
        discount_amount: Number.isNaN(discount) ? 0 : discount,
      }

      await updateOrder(editingOrder.id, payload)
      toast.success("Order updated.")
      setIsDialogOpen(false)
      await load()
    } catch (err) {
      console.error(err)
      toast.error("Failed to save order.")
    } finally {
      setSaving(false)
    }
  }

  const columns = React.useMemo<ColumnDef<Order, any>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Order",
        cell: ({ row }) => {
          const order = row.original
          return (
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold">
                #{String(order.id).padStart(4, "0")}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {formatDateTime(order.opened_at)}
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: "table",
        header: "Table",
        cell: ({ row }) => {
          const order = row.original
          return (
            <div className="flex items-center gap-1.5 text-[12px]">
              <Table2 className="h-3 w-3 text-muted-foreground" />
              <span>{order.table?.name ?? "—"}</span>
            </div>
          )
        },
      },
      {
        accessorKey: "waiter",
        header: "Waiter",
        cell: ({ row }) => {
          const order = row.original
          return (
            <div className="flex items-center gap-1.5 text-[12px]">
              <User className="h-3 w-3 text-muted-foreground" />
              <span>{order.waiter?.name ?? "—"}</span>
            </div>
          )
        },
      },
      {
        accessorKey: "client",
        header: "Client",
        cell: ({ row }) => {
          const order = row.original
          return (
            <span className="text-[12px] text-muted-foreground">
              {order.client?.name ?? "Walk-in"}
            </span>
          )
        },
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => {
          const order = row.original
          return (
            <div className="flex flex-col items-end">
              <span className="text-[13px] font-semibold">
                {order.total.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}
              </span>
              {order.discount_amount && order.discount_amount > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  Discount: -{order.discount_amount.toLocaleString()}
                </span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status
          return (
            <Badge
              variant="outline"
              className={cn(
                "h-5 rounded-full px-2 text-[10px] uppercase",
                orderStatusBadgeClass(status)
              )}
            >
              {formatOrderStatus(status)}
            </Badge>
          )
        },
      },
      {
        accessorKey: "payment_status",
        header: "Payment",
        cell: ({ row }) => {
          const payment = row.original.payment_status
          return (
            <Badge
              variant="outline"
              className={cn(
                "h-5 rounded-full px-2 text-[10px] uppercase",
                paymentBadgeClass(payment)
              )}
            >
              {payment}
            </Badge>
          )
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const order = row.original
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => openEditDialog(order)}>
                    <Eye className="mr-2 h-3 w-3" />
                    View / Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDelete(order)}
                    className="text-red-500"
                  >
                    <Trash2 className="mr-2 h-3 w-3" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [handleDelete, openEditDialog]
  )

  return (
    <div className="space-y-4">
      {/* Header + actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Orders</h2>
          <p className="text-sm text-muted-foreground">
            Review and maintain existing orders. Creation happens from the
            service flow (tables / KDS), not here.
          </p>
        </div>
        {/* No "Add Order" here by design */}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 text-[12px]">
        <div className="flex items-center gap-2">
          <Label className="text-[11px] text-muted-foreground">Status</Label>
          <Select
            value={statusFilter}
            onValueChange={(value: "all" | OrderStatusValue) =>
              setStatusFilter(value)
            }
          >
            <SelectTrigger className="h-8 w-[160px] rounded-sm border-muted-foreground/30 text-[12px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ORDER_STATUSES.map((st) => (
                <SelectItem key={st} value={st}>
                  {formatOrderStatus(st)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-[11px] text-muted-foreground">Payment</Label>
          <Select
            value={paymentFilter}
            onValueChange={(value: "all" | PaymentStatusValue) =>
              setPaymentFilter(value)
            }
          >
            <SelectTrigger className="h-8 w-[160px] rounded-sm border-muted-foreground/30 text-[12px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {PAYMENT_STATUSES.map((ps) => (
                <SelectItem key={ps} value={ps}>
                  {ps}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* DataTable */}
      <DataTable<Order>
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        totalLabel="orders"
        searchPlaceholder="Search orders (code, table, waiter, client)..."
        onSearchChange={handleSearchChange}
      />

      {/* View / Edit Dialog (discount + items) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              {dialogMode === "edit" ? "Order details" : "Order"}{" "}
              {editingOrder && (
                <span className="text-xs font-normal text-muted-foreground">
                  #{String(editingOrder.id).padStart(4, "0")}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              View the order summary, line items and adjust discount if needed.
            </DialogDescription>
          </DialogHeader>

          {editingOrder && (
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/40 p-3 text-[11px]">
                <div className="space-y-0.5">
                  <p className="text-muted-foreground">Table</p>
                  <p className="font-medium">
                    {editingOrder.table?.name ?? "—"}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground">Waiter</p>
                  <p className="font-medium">
                    {editingOrder.waiter?.name ?? "—"}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground">Status</p>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 rounded-full px-2 text-[10px] uppercase",
                        orderStatusBadgeClass(editingOrder.status)
                      )}
                    >
                      {formatOrderStatus(editingOrder.status)}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground">Payment</p>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 rounded-full px-2 text-[10px] uppercase",
                        paymentBadgeClass(editingOrder.payment_status)
                      )}
                    >
                      {editingOrder.payment_status}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground">Subtotal</p>
                  <p className="font-medium">
                    {editingOrder.subtotal.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium">
                    {editingOrder.total.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Items list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                    <UtensilsCrossed className="h-3 w-3" />
                    <span>Order items</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {(editingOrder.items?.length ?? 0) > 0
                      ? `${editingOrder.items?.length} item${
                          (editingOrder.items?.length ?? 0) > 1 ? "s" : ""
                        }`
                      : "No items"}
                  </span>
                </div>

                <ScrollArea className="max-h-56 rounded-md border bg-muted/30">
                  <div className="divide-y divide-border/60">
                    {editingOrder.items && editingOrder.items.length > 0 ? (
                      editingOrder.items.map((item) => {
                        const name =
                          // backend: product: { id, name, price }
                          // we still support a fallback if you map it differently
                          // (e.g. product_name on the API type)
                          item.product?.name ??
                          // @ts-expect-error - optional product_name
                          item.product_name ??
                          "Unknown product"

                        const unit = item.unit_price
                        const total = item.total_price
                        const qty = item.quantity
                        const notes = item.notes as string | null | undefined
                        const status = item.status as string

                        return (
                          <div
                            key={item.id}
                            className="flex items-start justify-between gap-3 px-3 py-2.5 text-[11px]"
                          >
                            <div className="flex flex-1 flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[12px] font-medium">
                                  {name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "h-4 rounded-full px-1.5 text-[9px] uppercase",
                                    itemStatusBadgeClass(status)
                                  )}
                                >
                                  {status}
                                </Badge>
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                                <span>Qty: {qty}</span>
                                <span>Unit: {unit.toLocaleString()}</span>
                                <span className="inline-flex items-center gap-1">
                                  <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/60" />
                                  Line: {total.toLocaleString()}
                                </span>
                              </div>
                              {notes && (
                                <p className="mt-1 line-clamp-2 text-[10px] italic text-muted-foreground">
                                  “{notes}”
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
                        No items found for this order.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Discount edit */}
              <div className="space-y-2">
                <Label htmlFor="discount">Discount amount</Label>
                <Input
                  id="discount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.discount_amount}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      discount_amount: e.target.value,
                    }))
                  }
                  placeholder="e.g. 200"
                />
                <p className="text-[11px] text-muted-foreground">
                  This will recalculate the final total on the backend.
                </p>
              </div>

              <DialogFooter className="mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Close
                </Button>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ----------------- Helpers ----------------- */

function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
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

function formatOrderStatus(status: OrderStatusValue): string {
  switch (status) {
    case "pending":
      return "Pending"
    case "in_progress":
      return "In progress"
    case "ready":
      return "Ready"
    case "served":
      return "Served"
    case "completed":
      return "Completed"
    case "cancelled":
      return "Cancelled"
    default:
      return status
  }
}

function orderStatusBadgeClass(status: OrderStatusValue): string {
  switch (status) {
    case "pending":
      return "border-amber-500/40 text-amber-600 bg-amber-500/5"
    case "in_progress":
      return "border-sky-500/40 text-sky-600 bg-sky-500/5"
    case "ready":
      return "border-emerald-500/40 text-emerald-600 bg-emerald-500/5"
    case "served":
      return "border-indigo-500/40 text-indigo-600 bg-indigo-500/5"
    case "completed":
      return "border-emerald-500/60 text-emerald-700 bg-emerald-500/10"
    case "cancelled":
      return "border-red-500/40 text-red-600 bg-red-500/5"
    default:
      return ""
  }
}

function paymentBadgeClass(status: PaymentStatusValue): string {
  const s = status.toLowerCase() as PaymentStatusValue
  if (s === "paid") return "border-emerald-500/40 text-emerald-600 bg-emerald-500/5"
  if (s === "partial") return "border-amber-500/40 text-amber-600 bg-amber-500/5"
  if (s === "refunded") return "border-sky-500/40 text-sky-600 bg-sky-500/5"
  if (s === "unpaid") return "border-muted-foreground/40 text-muted-foreground bg-muted/40"
  return ""
}

/**
 * Local badge styles for item-level status (OrderItemStatus)
 * pending → cooking → ready → served / cancelled
 */
function itemStatusBadgeClass(status: string): string {
  const s = status.toLowerCase()
  if (s === "pending") return "border-amber-500/40 text-amber-600 bg-amber-500/5"
  if (s === "cooking") return "border-sky-500/40 text-sky-600 bg-sky-500/5"
  if (s === "ready") return "border-emerald-500/40 text-emerald-600 bg-emerald-500/5"
  if (s === "served") return "border-indigo-500/40 text-indigo-600 bg-indigo-500/5"
  if (s === "cancelled") return "border-red-500/40 text-red-600 bg-red-500/5"
  return "border-muted-foreground/40 text-muted-foreground bg-muted/30"
}
