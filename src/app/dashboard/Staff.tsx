// src/app/staff/Staff.tsx
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

import type { Staff, StaffPayload, StaffRole } from "@/api/staff"
import {
  fetchStaff,
  createStaff,
  updateStaff,
  deleteStaff,
} from "@/api/staff"

type StaffFormState = {
  name: string
  email: string
  role: StaffRole
  password: string // required on create, optional on edit
}

const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  owner: "Owner",
  manager: "Manager",
  waiter: "Waiter",
  kitchen: "Kitchen",
  cashier: "Cashier",
  client: "Client",
}

const STAFF_FILTER_ROLES: StaffRole[] = [
  "owner",
  "manager",
  "waiter",
  "kitchen",
  "cashier",
]

export default function StaffPage() {
  const [data, setData] = React.useState<Staff[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState<StaffRole | "all">("all")

  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">("create")
  const [editingStaff, setEditingStaff] = React.useState<Staff | null>(null)
  const [form, setForm] = React.useState<StaffFormState>({
    name: "",
    email: "",
    role: "waiter",
    password: "",
  })
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(
    async (opts?: { search?: string; role?: StaffRole | "all" }) => {
      setIsLoading(true)
      try {
        const filters: any = {}
        const s = opts?.search ?? search
        const r = opts?.role ?? roleFilter

        if (s) filters.search = s
        if (r && r !== "all") filters.role = r

        const { items } = await fetchStaff(filters)
        setData(items)
      } catch (err) {
        console.error(err)
        toast.error("Failed to load staff.")
      } finally {
        setIsLoading(false)
      }
    },
    [search, roleFilter]
  )

  React.useEffect(() => {
    load()
  }, [load])

  function handleSearchChange(value: string) {
    setSearch(value)
    load({ search: value })
  }

  async function handleRoleFilterChange(value: string) {
    const nextRole = (value === "all" ? "all" : (value as StaffRole)) as
      | StaffRole
      | "all"
    setRoleFilter(nextRole)
    await load({ role: nextRole })
  }

  function openCreateDialog() {
    setDialogMode("create")
    setEditingStaff(null)
    setForm({
      name: "",
      email: "",
      role: "waiter",
      password: "",
    })
    setIsDialogOpen(true)
  }

  function openEditDialog(staff: Staff) {
    setDialogMode("edit")
    setEditingStaff(staff)
    setForm({
      name: staff.name ?? "",
      email: staff.email ?? "",
      role: staff.role,
      password: "", // keep empty; only send if changed
    })
    setIsDialogOpen(true)
  }

  async function handleDelete(staff: Staff) {
    if (!confirm(`Delete staff member "${staff.name}"?`)) return
    try {
      await deleteStaff(staff.id)
      toast.success("Staff member deleted.")
      await load()
    } catch (err) {
      console.error(err)
      toast.error("Failed to delete staff member.")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: StaffPayload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        role: form.role,
      }

      if (!payload.name) {
        toast.error("Name is required.")
        return
      }

      if (payload.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email)) {
        toast.error("Please provide a valid email.")
        return
      }

      const trimmedPassword = form.password.trim()

      if (dialogMode === "create") {
        if (!trimmedPassword || trimmedPassword.length < 6) {
          toast.error("Password must be at least 6 characters.")
          return
        }
        payload.password = trimmedPassword
        await createStaff(payload)
        toast.success("Staff member created.")
      } else if (dialogMode === "edit" && editingStaff) {
        if (trimmedPassword) {
          payload.password = trimmedPassword
        }
        await updateStaff(editingStaff.id, payload)
        toast.success("Staff member updated.")
      }

      setIsDialogOpen(false)
      await load()
    } catch (err) {
      console.error(err)
      toast.error("Failed to save staff member.")
    } finally {
      setSaving(false)
    }
  }

  const columns = React.useMemo<ColumnDef<Staff, any>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Staff",
        cell: ({ row }) => {
          const s = row.original
          return (
            <div className="flex flex-col">
              <span className="text-[13px] font-medium">{s.name}</span>
              {s.email && (
                <span className="text-[11px] text-muted-foreground">
                  {s.email}
                </span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => {
          const role = row.original.role
          const label = STAFF_ROLE_LABELS[role] ?? role
          const colorClasses =
            role === "owner"
              ? "bg-indigo-500/10 text-indigo-500 ring-1 ring-indigo-500/30"
              : role === "manager"
              ? "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/30"
              : role === "waiter"
              ? "bg-sky-500/10 text-sky-500 ring-1 ring-sky-500/30"
              : role === "kitchen"
              ? "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/30"
              : role === "cashier"
              ? "bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/30"
              : "bg-slate-800/60 text-slate-200"

          return (
            <Badge
              variant="secondary"
              className={cn(
                "h-5 rounded-full px-2 text-[10px] font-medium",
                colorClasses
              )}
            >
              {label}
            </Badge>
          )
        },
      },
      {
        accessorKey: "created_at",
        header: "Added on",
        cell: ({ row }) => {
          const s = row.original
          if (!s.created_at) {
            return (
              <span className="text-[12px] text-muted-foreground">—</span>
            )
          }
          const d = new Date(s.created_at)
          return (
            <span className="text-[12px] text-muted-foreground">
              {d.toLocaleDateString(undefined, {
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
          const staff = row.original
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
                  <DropdownMenuItem onClick={() => openEditDialog(staff)}>
                    <Edit2 className="mr-2 h-3 w-3" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDelete(staff)}
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
          <h2 className="text-xl font-semibold">Staff</h2>
          <p className="text-sm text-muted-foreground">
            Manage registered staff members and their key details.
          </p>
        </div>
        <Button onClick={openCreateDialog}>Add Staff</Button>
      </div>

      {/* Filters row (role) */}
      <div className="flex flex-wrap gap-2 text-[12px]">
        <div className="flex items-center gap-2">
          <Label className="text-[11px] text-muted-foreground">Role</Label>
          <Select
            value={roleFilter}
            onValueChange={handleRoleFilterChange}
          >
            <SelectTrigger className="h-8 w-[160px] rounded-sm border-muted-foreground/30 text-[12px]">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {STAFF_FILTER_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {STAFF_ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* DataTable */}
      <DataTable<Staff>
        columns={columns}
        data={data}
        isLoading={isLoading}
        totalLabel="staff members"
        searchPlaceholder="Search by name or email..."
        onSearchChange={handleSearchChange}
      />

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Add staff member" : "Edit staff member"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Control access to the restaurant operations by assigning staff
              roles and credentials.
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
                placeholder="e.g. John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={form.role}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, role: value as StaffRole }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_FILTER_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {STAFF_ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {dialogMode === "create" ? "Password" : "Password (optional)"}
              </Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder={
                  dialogMode === "create"
                    ? "Set a sign-in password"
                    : "Leave blank to keep current password"
                }
              />
              {dialogMode === "create" && (
                <p className="text-[11px] text-muted-foreground">
                  Minimum 6 characters. Staff will use this to sign in.
                </p>
              )}
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
