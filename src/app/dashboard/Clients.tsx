// src/app/clients/Clients.tsx
import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Edit2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { DataTable } from "@/components/data-table"

import { Button } from "@/components/ui/button"
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

import type { Client, ClientPayload } from "@/api/client"
import {
  fetchClients,
  createClient,
  updateClient,
  deleteClient,
} from "@/api/client"

type ClientFormState = {
  name: string
  email: string
  phone: string
  external_id: string
}

export default function Clients() {
  const [data, setData] = React.useState<Client[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")

  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">("create")
  const [editingClient, setEditingClient] = React.useState<Client | null>(null)
  const [form, setForm] = React.useState<ClientFormState>({
    name: "",
    email: "",
    phone: "",
    external_id: "",
  })
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(
    async (opts?: { search?: string }) => {
      setIsLoading(true)
      try {
        const s = opts?.search ?? search
        const filters: any = {}
        if (s) filters.search = s

        const { items } = await fetchClients(filters)
        setData(items)
      } catch (err) {
        console.error(err)
        toast.error("Failed to load clients.")
      } finally {
        setIsLoading(false)
      }
    },
    [search]
  )

  React.useEffect(() => {
    load()
  }, [load])

  function handleSearchChange(value: string) {
    setSearch(value)
    load({ search: value })
  }

  function openCreateDialog() {
    setDialogMode("create")
    setEditingClient(null)
    setForm({
      name: "",
      email: "",
      phone: "",
      external_id: "",
    })
    setIsDialogOpen(true)
  }

  function openEditDialog(client: Client) {
    setDialogMode("edit")
    setEditingClient(client)
    setForm({
      name: client.name ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      external_id: client.external_id ?? "",
    })
    setIsDialogOpen(true)
  }

  async function handleDelete(client: Client) {
    if (!confirm(`Delete client "${client.name}"?`)) return
    try {
      await deleteClient(client.id)
      toast.success("Client deleted.")
      await load()
    } catch (err) {
      console.error(err)
      toast.error("Failed to delete client.")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: ClientPayload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        external_id: form.external_id.trim() || null,
      }

      if (!payload.name) {
        toast.error("Name is required.")
        return
      }

      if (payload.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email)) {
        toast.error("Please provide a valid email.")
        return
      }

      if (dialogMode === "create") {
        await createClient(payload)
        toast.success("Client created.")
      } else if (dialogMode === "edit" && editingClient) {
        await updateClient(editingClient.id, payload)
        toast.success("Client updated.")
      }

      setIsDialogOpen(false)
      await load()
    } catch (err) {
      console.error(err)
      toast.error("Failed to save client.")
    } finally {
      setSaving(false)
    }
  }

  const columns = React.useMemo<ColumnDef<Client, any>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Client",
        cell: ({ row }) => {
          const c = row.original
          return (
            <div className="flex flex-col">
              <span className="text-[13px] font-medium">{c.name}</span>
              {c.external_id && (
                <span className="text-[11px] text-muted-foreground">
                  ID: <span className="font-mono">{c.external_id}</span>
                </span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "contact",
        header: "Contact",
        cell: ({ row }) => {
          const c = row.original
          const hasEmail = !!c.email
          const hasPhone = !!c.phone
          if (!hasEmail && !hasPhone) {
            return (
              <span className="text-[12px] text-muted-foreground">
                No contact info
              </span>
            )
          }
          return (
            <div className="flex flex-col">
              {c.email && (
                <span className="text-[12px] text-muted-foreground">
                  {c.email}
                </span>
              )}
              {c.phone && (
                <span className="text-[11px] text-muted-foreground">
                  {c.phone}
                </span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "created_at",
        header: "Added on",
        cell: ({ row }) => {
          const c = row.original
          if (!c.created_at) {
            return (
              <span className="text-[12px] text-muted-foreground">—</span>
            )
          }
          const d = new Date(c.created_at)
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
          const client = row.original
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
                  <DropdownMenuItem onClick={() => openEditDialog(client)}>
                    <Edit2 className="mr-2 h-3 w-3" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDelete(client)}
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
          <h2 className="text-xl font-semibold">Clients</h2>
          <p className="text-sm text-muted-foreground">
            Manage client records and their contact information.
          </p>
        </div>
        <Button onClick={openCreateDialog}>Add Client</Button>
      </div>

      {/* DataTable */}
      <DataTable<Client>
        columns={columns}
        data={data}
        isLoading={isLoading}
        totalLabel="clients"
        searchPlaceholder="Search by name, email, or phone..."
        onSearchChange={handleSearchChange}
      />

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Add client" : "Edit client"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Store client details to reuse them in reservations, orders, and
              communication.
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
                placeholder="e.g. Jane Doe"
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
                placeholder="jane@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="+2547..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="external_id">External ID (optional)</Label>
              <Input
                id="external_id"
                value={form.external_id}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    external_id: e.target.value,
                  }))
                }
                placeholder="ID from PMS, CRM, or another system"
              />
              <p className="text-[11px] text-muted-foreground">
                Useful if this client also exists in other tools (e.g. PMS or CRM).
              </p>
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
