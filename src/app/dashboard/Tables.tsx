// src/app/room/Tables.tsx
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

import type { Table, TablePayload, TableStatus } from "@/api/table"
import {
  fetchTables,
  createTable,
  updateTable,
  deleteTable,
} from "@/api/table"
import { fetchFloorPlans } from "@/api/floor"

type TableFormState = {
  name: string
  capacity: string
  floor_plan_id: string // "none" | "<id>"
}

type FloorOption = {
  id: number
  name: string
}

const STATUS_OPTIONS: { value: TableStatus; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "reserved", label: "Reserved" },
  { value: "occupied", label: "Occupied" },
  { value: "needs_cleaning", label: "Needs cleaning" },
]

type StatusFilter = "all" | TableStatus

export default function Tables() {
  const [data, setData] = React.useState<Table[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all")
  const [floorFilter, setFloorFilter] = React.useState<string>("all")

  const [floors, setFloors] = React.useState<FloorOption[]>([])

  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">("create")
  const [editingTable, setEditingTable] = React.useState<Table | null>(null)
  const [form, setForm] = React.useState<TableFormState>({
    name: "",
    capacity: "",
    floor_plan_id: "none",
  })
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const tables = await fetchTables()
      setData(tables)
    } catch (err) {
      console.error(err)
      toast.error("Failed to load tables.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  React.useEffect(() => {
    ;(async () => {
      try {
        const floorPlans = await fetchFloorPlans()
        setFloors(floorPlans.map((f: any) => ({ id: f.id, name: f.name })))
      } catch (err) {
        console.error(err)
      }
    })()
  }, [])

  // Derived rows based on filters + search
  const filteredData = React.useMemo(() => {
    return data
      .filter((t) => {
        if (statusFilter === "all") return true
        return t.status === statusFilter
      })
      .filter((t) => {
        if (floorFilter === "all") return true
        const fpId = t.floor_plan?.id ? String(t.floor_plan.id) : "none"
        return fpId === floorFilter
      })
      .filter((t) => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return (
          t.name.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q)
        )
      })
  }, [data, statusFilter, floorFilter, search])

  function handleSearchChange(value: string) {
    setSearch(value)
  }

  function openCreateDialog() {
    setDialogMode("create")
    setEditingTable(null)
    setForm({
      name: "",
      capacity: "",
      floor_plan_id: "none",
    })
    setIsDialogOpen(true)
  }

  function openEditDialog(table: Table) {
    setDialogMode("edit")
    setEditingTable(table)
    setForm({
      name: table.name,
      capacity: table.capacity ? String(table.capacity) : "",
      floor_plan_id: table.floor_plan?.id ? String(table.floor_plan.id) : "none",
    })
    setIsDialogOpen(true)
  }

  async function handleDelete(table: Table) {
    if (!confirm(`Delete table "${table.name}"?`)) return
    try {
      await deleteTable(table.id)
      toast.success("Table deleted.")
      await load()
    } catch (err) {
      console.error(err)
      toast.error("Failed to delete table.")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: TablePayload = {
        name: form.name.trim(),
        capacity: Number(form.capacity),
      }

      if (!payload.name) {
        toast.error("Name is required.")
        return
      }

      if (!form.capacity || Number.isNaN(payload.capacity) || payload.capacity <= 0) {
        toast.error("Capacity must be a positive number.")
        return
      }

      if (form.floor_plan_id && form.floor_plan_id !== "none") {
        payload.floor_plan_id = Number(form.floor_plan_id)
      } else {
        payload.floor_plan_id = null
      }

      if (dialogMode === "create") {
        await createTable(payload)
        toast.success("Table created.")
      } else if (dialogMode === "edit" && editingTable) {
        await updateTable(editingTable.id, payload)
        toast.success("Table updated.")
      }

      setIsDialogOpen(false)
      await load()
    } catch (err) {
      console.error(err)
      toast.error("Failed to save table.")
    } finally {
      setSaving(false)
    }
  }

  const columns = React.useMemo<ColumnDef<Table, any>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Table",
        cell: ({ row }) => {
          const t = row.original
          return (
            <div className="flex flex-col">
              <span className="text-[13px] font-medium">{t.name}</span>
              <span className="text-[11px] text-muted-foreground">
                Code: {t.code}
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: "floor_plan",
        header: "Floor",
        cell: ({ row }) => (
          <span className="text-[12px] text-muted-foreground">
            {row.original.floor_plan?.name ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "capacity",
        header: "Capacity",
        cell: ({ row }) => (
          <span className="text-[12px] font-medium">
            {row.original.capacity} guests
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status

          const label =
            STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status

          const styles: Record<TableStatus, string> = {
            free: "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/30",
            reserved: "bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/30",
            occupied: "bg-red-500/10 text-red-500 ring-1 ring-red-500/30",
            needs_cleaning:
              "bg-sky-500/10 text-sky-500 ring-1 ring-sky-500/30",
          }

          return (
            <Badge
              variant="secondary"
              className={cn(
                "h-5 rounded-full px-2 text-[10px]",
                styles[status]
              )}
            >
              {label}
            </Badge>
          )
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const table = row.original
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
                  <DropdownMenuItem onClick={() => openEditDialog(table)}>
                    <Edit2 className="mr-2 h-3 w-3" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDelete(table)}
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
          <h2 className="text-xl font-semibold">Tables</h2>
          <p className="text-sm text-muted-foreground">
            Manage dining tables, their location and seating capacity.
          </p>
        </div>
        <Button onClick={openCreateDialog}>Add Table</Button>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 text-[12px]">
        <div className="flex items-center gap-2">
          <Label className="text-[11px] text-muted-foreground">Status</Label>
          <Select
            value={statusFilter}
            onValueChange={(value: StatusFilter) => setStatusFilter(value)}
          >
            <SelectTrigger className="h-8 w-[160px] rounded-sm border-muted-foreground/30 text-[12px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-[11px] text-muted-foreground">Floor</Label>
          <Select
            value={floorFilter}
            onValueChange={(value) => setFloorFilter(value)}
          >
            <SelectTrigger className="h-8 w-[160px] rounded-sm border-muted-foreground/30 text-[12px]">
              <SelectValue placeholder="All floors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All floors</SelectItem>
              <SelectItem value="none">No floor</SelectItem>
              {floors.map((f) => (
                <SelectItem key={f.id} value={String(f.id)}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* DataTable */}
      <DataTable<Table>
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        totalLabel="tables"
        searchPlaceholder="Search by name or code..."
        onSearchChange={handleSearchChange}
      />

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Add table" : "Edit table"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure the table name, its seating capacity and the floor it
              belongs to.
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
                placeholder="e.g. T1, Window Table, VIP 3"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, capacity: e.target.value }))
                }
                placeholder="Number of guests"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="floor_plan">Floor</Label>
              <Select
                value={form.floor_plan_id}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, floor_plan_id: value }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select floor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No floor</SelectItem>
                  {floors.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Assigning a floor helps visualize tables in your floor plan
                view.
              </p>
            </div>

            {dialogMode === "edit" && editingTable && (
              <div className="rounded-md border bg-muted/40 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">
                  Code: <span className="font-mono">{editingTable.code}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  QR token:{" "}
                  <span className="font-mono break-all">
                    {editingTable.qr_token}
                  </span>
                </p>
              </div>
            )}

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
