// src/app/settings/FloorPlans.tsx
import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Edit2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { DataTable } from "@/components/data-table"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

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

import type { FloorPlan, FloorPlanPayload } from "@/api/floor"
import {
  fetchFloorPlans,
  createFloorPlan,
  updateFloorPlan,
  deleteFloorPlan,
} from "@/api/floor"

type FloorFormState = {
  name: string
  status: string // "active" | "inactive"
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
]

export default function FloorPlans() {
  const [data, setData] = React.useState<FloorPlan[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")

  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">("create")
  const [editingFloor, setEditingFloor] = React.useState<FloorPlan | null>(null)
  const [form, setForm] = React.useState<FloorFormState>({
    name: "",
    status: "active",
  })
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(
    async (opts?: { search?: string; status?: string }) => {
      setIsLoading(true)
      try {
        const s = opts?.search ?? search
        const status = opts?.status ?? statusFilter

        const params: any = {}
        if (s) params.search = s
        if (status && status !== "all") params.status = status

        const items = await fetchFloorPlans(params)

        const filtered = s
          ? items.filter((f) =>
              f.name.toLowerCase().includes(s.toLowerCase().trim())
            )
          : items

        setData(filtered)
      } catch (err) {
        console.error(err)
        toast.error("Failed to load floor plans.")
      } finally {
        setIsLoading(false)
      }
    },
    [search, statusFilter]
  )

  React.useEffect(() => {
    load()
  }, [load])

  function handleSearchChange(value: string) {
    setSearch(value)
    load({ search: value })
  }

  async function handleStatusFilterChange(value: string) {
    setStatusFilter(value)
    await load({ status: value })
  }

  function openCreateDialog() {
    setDialogMode("create")
    setEditingFloor(null)
    setForm({
      name: "",
      status: "active",
    })
    setIsDialogOpen(true)
  }

  function openEditDialog(floor: FloorPlan) {
    setDialogMode("edit")
    setEditingFloor(floor)
    setForm({
      name: floor.name,
      status: floor.status || "active",
    })
    setIsDialogOpen(true)
  }

  async function handleDelete(floor: FloorPlan) {
    if (!confirm(`Delete floor "${floor.name}"?`)) return
    try {
      await deleteFloorPlan(floor.id)
      toast.success("Floor plan deleted.")
      await load()
    } catch (err) {
      console.error(err)
      toast.error("Failed to delete floor plan.")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: FloorPlanPayload = {
        name: form.name.trim(),
        status: form.status,
      }

      if (!payload.name) {
        toast.error("Name is required.")
        return
      }

      if (dialogMode === "create") {
        await createFloorPlan(payload)
        toast.success("Floor plan created.")
      } else if (dialogMode === "edit" && editingFloor) {
        await updateFloorPlan(editingFloor.id, payload)
        toast.success("Floor plan updated.")
      }

      setIsDialogOpen(false)
      await load()
    } catch (err) {
      console.error(err)
      toast.error("Failed to save floor plan.")
    } finally {
      setSaving(false)
    }
  }

  const columns = React.useMemo<ColumnDef<FloorPlan, any>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-[13px] font-medium">
              {row.original.name}
            </span>
            {row.original.restaurant?.name && (
              <span className="text-[11px] text-muted-foreground">
                {row.original.restaurant.name}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status
          const isActive = status === "active"
          return (
            <Badge
              className={cn(
                "h-5 rounded-full px-2 text-[10px]",
                isActive
                  ? "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/30"
                  : "bg-slate-800/60 text-slate-200"
              )}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          )
        },
      },
      {
        id: "tables",
        header: "Tables",
        cell: ({ row }) => {
          const count = row.original.tables?.length ?? 0
          return (
            <span className="text-[12px] text-muted-foreground">{count}</span>
          )
        },
      },
      {
        accessorKey: "created_at",
        header: "Created",
        cell: ({ row }) => {
          if (!row.original.created_at) {
            return (
              <span className="text-[12px] text-muted-foreground">—</span>
            )
          }
          const date = new Date(row.original.created_at)
          return (
            <span className="text-[12px] text-muted-foreground">
              {date.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          )
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const floor = row.original
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
                  <DropdownMenuItem onClick={() => openEditDialog(floor)}>
                    <Edit2 className="mr-2 h-3 w-3" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDelete(floor)}
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
    []
  )

  return (
    <div className="space-y-4">
      {/* Header + actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Floor Plans</h2>
          <p className="text-sm text-muted-foreground">
            Design and manage restaurant floor layouts.
          </p>
        </div>
        <Button onClick={openCreateDialog}>Add Floor</Button>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 text-[12px]">
        <div className="flex items-center gap-2">
          <Label className="text-[11px] text-muted-foreground">Search</Label>
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search floors..."
            className="h-8 w-[200px] rounded-sm text-[12px]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-[11px] text-muted-foreground">Status</Label>
          <Select
            value={statusFilter}
            onValueChange={(value) => handleStatusFilterChange(value)}
          >
            <SelectTrigger className="h-8 w-40 rounded-sm border-muted-foreground/30 text-[12px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

      </div>

      {/* DataTable */}
      <DataTable<FloorPlan>
        columns={columns}
        data={data}
        isLoading={isLoading}
        totalLabel="floors"
        searchPlaceholder="Search floors..."
        onSearchChange={handleSearchChange}
      />

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Add floor" : "Edit floor"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Name the floor and control whether it’s currently active in your
              operations.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Main Hall, Terrace, VIP Lounge"
                required
              />
            </div>

            <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
              <div className="space-y-0.5">
                <Label className="text-xs">Active</Label>
                <p className="text-[11px] text-muted-foreground">
                  Inactive floors are hidden from day-to-day operations but kept
                  for future use and reporting.
                </p>
              </div>
              <Switch
                checked={form.status === "active"}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({
                    ...prev,
                    status: checked ? "active" : "inactive",
                  }))
                }
              />
            </div>

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving
                  ? dialogMode === "create"
                    ? "Creating..."
                    : "Saving..."
                  : dialogMode === "create"
                  ? "Create"
                  : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
