import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Edit2, MoreHorizontal, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import type { Category } from "@/api/category"
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/api/category"
import { DataTable } from "@/components/data-table"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type CategoryFormState = {
  name: string
  position: string
  is_active: boolean
}

export default function Categories() {
  const [data, setData] = React.useState<Category[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [selectedIds, setSelectedIds] = React.useState<Array<Category["id"]>>([])

  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">("create")
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null)
  const [form, setForm] = React.useState<CategoryFormState>({
    name: "",
    position: "",
    is_active: true,
  })
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(
    async (opts?: { search?: string }) => {
      setIsLoading(true)
      try {
        const cats = await fetchCategories({ search: opts?.search ?? search })
        setData(cats)
      } catch (err) {
        console.error(err)
        toast.error("Failed to load categories.")
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
    // Fetch with new search value
    load({ search: value })
  }

  function openCreateDialog() {
    setDialogMode("create")
    setEditingCategory(null)
    setForm({
      name: "",
      position: "",
      is_active: true,
    })
    setIsDialogOpen(true)
  }

  function openEditDialog(category: Category) {
    setDialogMode("edit")
    setEditingCategory(category)
    setForm({
      name: category.name,
      position: String(category.position ?? ""),
      is_active: category.is_active,
    })
    setIsDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        position: form.position ? Number(form.position) : undefined,
        is_active: form.is_active,
      }

      if (!payload.name) {
        toast.error("Name is required.")
        return
      }

      if (dialogMode === "create") {
        await createCategory(payload)
        toast.success("Category created.")
      } else if (dialogMode === "edit" && editingCategory) {
        await updateCategory(editingCategory.id, payload)
        toast.success("Category updated.")
      }

      setIsDialogOpen(false)
      await load()
    } catch (err) {
      console.error(err)
      toast.error("Failed to save category.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(category: Category) {
    if (!confirm(`Delete category "${category.name}"?`)) return
    try {
      await deleteCategory(category.id)
      toast.success("Category deleted.")
      await load()
    } catch (err) {
      console.error(err)
      toast.error("Failed to delete category.")
    }
  }

  const columns = React.useMemo<ColumnDef<Category, any>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="font-medium text-xs">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "position",
        header: "Position",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.position}
          </span>
        ),
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => {
          const active = row.original.is_active
          return (
            <Badge
              variant={active ? "default" : "secondary"}
              className={cn(
                "h-5 rounded-full px-2 text-[10px]",
                active
                  ? "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/30"
                  : "bg-slate-800/60 text-slate-200"
              )}
            >
              {active ? "Active" : "Hidden"}
            </Badge>
          )
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const category = row.original
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => openEditDialog(category)}
                  >
                    <Edit2 className="mr-2 h-3 w-3" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDelete(category)}
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
          <h2 className="text-xl font-semibold">Product Categories</h2>
          <p className="text-sm text-muted-foreground">
            Organize menu items into structured product categories.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              disabled
            >
              <Trash2 className="mr-2 h-3 w-3" />
              Delete selected ({selectedIds.length})
            </Button>
          )}
          <Button size="sm" onClick={openCreateDialog}>
            Add Category
          </Button>
        </div>
      </div>

      {/* DataTable */}
      <DataTable<Category>
        columns={columns}
        data={data}
        isLoading={isLoading}
        totalLabel="categories"
        searchPlaceholder="Search categories..."
        onSearchChange={handleSearchChange}
        onSelectionChange={setSelectedIds}
      />

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Add category" : "Edit category"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {dialogMode === "create"
                ? "Create a new category to group similar menu items."
                : "Update this category’s details."}
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
                placeholder="e.g. Starters, Main Dishes, Drinks"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position (optional)</Label>
              <Input
                id="position"
                type="number"
                min={1}
                value={form.position}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, position: e.target.value }))
                }
                placeholder="1, 2, 3..."
              />
              <p className="text-[11px] text-muted-foreground">
                Lower numbers appear first in the menu. If left empty, it will
                be automatically placed at the end.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
              <div className="space-y-0.5">
                <Label className="text-xs">Active</Label>
                <p className="text-[11px] text-muted-foreground">
                  Inactive categories are hidden from the menu but kept in your
                  backoffice.
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, is_active: checked }))
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
