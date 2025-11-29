// src/app/menu/Products.tsx
import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  Image as ImageIcon, 
  UploadCloud, // Added for empty state
  ImagePlus // Added for hover state
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { DataTable } from "@/components/data-table"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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

import type { Product, ProductPayload } from "@/api/product"
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
} from "@/api/product"
import { fetchCategories } from "@/api/category"

// --- HELPERS ---

const BACKEND_STORAGE_URL = "http://localhost:8000/storage/"

function getImageUrl(path: string | null | undefined) {
  if (!path) return null
  if (path.startsWith("http")) return path
  return `${BACKEND_STORAGE_URL}${path}`
}

// --- TYPES ---

type ProductFormState = {
  name: string
  category_id: string 
  price: string
  description: string
  is_available: boolean
}

type CategoryOption = {
  id: number
  name: string
}

const MAX_IMAGE_SIZE_MB = 2

export default function Products() {
  const [data, setData] = React.useState<Product[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all")
  const [availabilityFilter, setAvailabilityFilter] =
    React.useState<"all" | "available" | "unavailable">("all")

  const [categories, setCategories] = React.useState<CategoryOption[]>([])

  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">("create")
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null)
  const [form, setForm] = React.useState<ProductFormState>({
    name: "",
    category_id: "none",
    price: "",
    description: "",
    is_available: true,
  })
  const [saving, setSaving] = React.useState(false)

  // 👇 Image state
  const [imageFile, setImageFile] = React.useState<File | null>(null)
  const [imagePreview, setImagePreview] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const load = React.useCallback(
    async (opts?: {
      search?: string
      categoryId?: string
      availability?: "all" | "available" | "unavailable"
    }) => {
      setIsLoading(true)
      try {
        const filters: any = {}
        const s = opts?.search ?? search
        const cat = opts?.categoryId ?? categoryFilter
        const avail = opts?.availability ?? availabilityFilter

        if (s) filters.search = s
        if (cat && cat !== "all") filters.category_id = Number(cat)
        if (avail === "available") filters.available = true
        if (avail === "unavailable") filters.available = false

        const { items } = await fetchProducts(filters)
        setData(items)
      } catch (err) {
        console.error(err)
        toast.error("Failed to load products.")
      } finally {
        setIsLoading(false)
      }
    },
    [search, categoryFilter, availabilityFilter]
  )

  React.useEffect(() => {
    load()
  }, [load])

  React.useEffect(() => {
    ;(async () => {
      try {
        const cats = await fetchCategories()
        setCategories(cats)
      } catch (err) {
        console.error(err)
      }
    })()
  }, [])

  // Cleanup blob URLs when preview changes
  React.useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  function handleSearchChange(value: string) {
    setSearch(value)
    load({ search: value })
  }

  async function handleCategoryFilterChange(value: string) {
    setCategoryFilter(value)
    await load({ categoryId: value })
  }

  async function handleAvailabilityFilterChange(
    value: "all" | "available" | "unavailable"
  ) {
    setAvailabilityFilter(value)
    await load({ availability: value })
  }

  function resetImageState(initialUrl?: string | null) {
    setImageFile(null)
    setImagePreview(initialUrl ?? null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  function openCreateDialog() {
    setDialogMode("create")
    setEditingProduct(null)
    setForm({
      name: "",
      category_id: "none",
      price: "",
      description: "",
      is_available: true,
    })
    resetImageState(null)
    setIsDialogOpen(true)
  }

  function openEditDialog(product: Product) {
    setDialogMode("edit")
    setEditingProduct(product)
    setForm({
      name: product.name,
      category_id: product.category_id ? String(product.category_id) : "none",
      price: product.price ? String(product.price) : "",
      description: product.description ?? "",
      is_available: product.is_available,
    })
    resetImageState(getImageUrl(product.image_path))
    setIsDialogOpen(true)
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Delete product "${product.name}"?`)) return
    try {
      await deleteProduct(product.id)
      toast.success("Product deleted.")
      await load()
    } catch (err) {
      console.error(err)
      toast.error("Failed to delete product.")
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null

    if (!file) {
      setImageFile(null)
      // Keep existing image if editing
      setImagePreview(editingProduct?.image_path ? getImageUrl(editingProduct.image_path) : null)
      return
    }

    const sizeMb = file.size / (1024 * 1024)
    if (sizeMb > MAX_IMAGE_SIZE_MB) {
      toast.error(`Image is too large. Max ${MAX_IMAGE_SIZE_MB}MB.`)
      e.target.value = ""
      return
    }

    // Cleanup previous blob
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview)
    }

    const url = URL.createObjectURL(file)
    setImageFile(file)
    setImagePreview(url)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: ProductPayload = {
        name: form.name.trim(),
        price: Number(form.price),
        description: form.description.trim() || undefined,
        is_available: form.is_available,
      }

      if (!payload.name) {
        toast.error("Name is required.")
        return
      }
      if (Number.isNaN(payload.price) || payload.price < 0) {
        toast.error("Price must be a valid number.")
        return
      }

      if (form.category_id && form.category_id !== "none") {
        payload.category_id = Number(form.category_id)
      } else {
        payload.category_id = null
      }

      let saved: Product

      if (dialogMode === "create") {
        saved = await createProduct(payload)
        if (imageFile) {
          saved = await uploadProductImage(saved.id, imageFile)
        }
        toast.success("Product created.")
      } else if (dialogMode === "edit" && editingProduct) {
        saved = await updateProduct(editingProduct.id, payload)
        if (imageFile) {
          saved = await uploadProductImage(editingProduct.id, imageFile)
        }
        toast.success("Product updated.")
      } else {
        return
      }

      setIsDialogOpen(false)
      await load()
    } catch (err) {
      console.error(err)
      toast.error("Failed to save product.")
    } finally {
      setSaving(false)
    }
  }

  const columns = React.useMemo<ColumnDef<Product, any>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-[13px] font-medium">{row.original.name}</span>
            {row.original.description && (
              <span className="text-[11px] text-muted-foreground line-clamp-1">
                {row.original.description}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <span className="text-[12px] text-muted-foreground">
            {row.original.category?.name ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) => (
          <span className="text-[12px] font-medium">
            {row.original.price.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        accessorKey: "is_available",
        header: "Availability",
        cell: ({ row }) => {
          const available = row.original.is_available
          return (
            <Badge
              variant={available ? "default" : "secondary"}
              className={cn(
                "h-5 rounded-full px-2 text-[10px]",
                available
                  ? "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/30"
                  : "bg-slate-800/60 text-slate-200"
              )}
            >
              {available ? "Available" : "Unavailable"}
            </Badge>
          )
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const product = row.original
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
                  <DropdownMenuItem onClick={() => openEditDialog(product)}>
                    <Edit2 className="mr-2 h-3 w-3" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDelete(product)}
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
          <h2 className="text-xl font-semibold">Products</h2>
          <p className="text-sm text-muted-foreground">
            Manage individual menu items and their pricing details.
          </p>
        </div>
        <Button onClick={openCreateDialog}>Add Product</Button>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 text-[12px]">
        {/* ... (Existing Filters) ... */}
        {/* Keeping filters exactly as they were */}
        <div className="flex items-center gap-2">
            <Label className="text-[11px] text-muted-foreground">Category</Label>
            <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
                <SelectTrigger className="h-8 w-[160px] rounded-sm border-muted-foreground/30 text-[12px]"><SelectValue placeholder="All categories" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((cat) => <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
        <div className="flex items-center gap-2">
            <Label className="text-[11px] text-muted-foreground">Availability</Label>
            <Select value={availabilityFilter} onValueChange={(v:any) => handleAvailabilityFilterChange(v)}>
                <SelectTrigger className="h-8 w-[140px] rounded-sm border-muted-foreground/30 text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      {/* DataTable */}
      <DataTable<Product>
        columns={columns}
        data={data}
        isLoading={isLoading}
        totalLabel="products"
        searchPlaceholder="Search products..."
        onSearchChange={handleSearchChange}
        getImageSrc={(p) => getImageUrl(p.image_path)}
        getImageAlt={(p) => p.name}
        imageColumnHeader=""
      />

      {/* Create / Edit Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Add product" : "Edit product"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Define the menu item, its category, price, availability, and image.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            
            {/* NEW: Improved Image Upload Section */}
            <div className="space-y-2">
                <Label>Image</Label>
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative flex h-40 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/5 transition-all hover:bg-muted/10 hover:border-muted-foreground/50"
                >
                    {imagePreview ? (
                        <>
                            <img 
                                src={imagePreview} 
                                alt="Preview" 
                                className="h-full w-full object-cover transition-opacity group-hover:opacity-75"
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                                <div className="flex items-center gap-2 rounded-full bg-background/80 px-4 py-2 text-sm font-medium text-foreground backdrop-blur-sm shadow-sm">
                                    <ImagePlus className="h-4 w-4" />
                                    Change Image
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 text-center">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shadow-sm ring-1 ring-muted-foreground/10">
                                <UploadCloud className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-sm font-medium text-foreground">Click to upload image</p>
                                <p className="text-[11px] text-muted-foreground">PNG, JPG up to {MAX_IMAGE_SIZE_MB}MB</p>
                            </div>
                        </div>
                    )}
                </div>
                {/* Hidden Input remains the same */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Grilled Chicken, Fresh Juice"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={form.category_id || ""}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, category_id: value }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="price">Price</Label>
                    <Input
                        id="price"
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.price}
                        onChange={(e) =>
                        setForm((prev) => ({ ...prev, price: e.target.value }))
                        }
                        placeholder="e.g. 500"
                        required
                    />
                </div>
                 <div className="flex flex-col justify-end pb-2">
                    <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 h-10">
                        <span className="text-xs font-medium">Available</span>
                        <Switch
                            checked={form.is_available}
                            onCheckedChange={(checked) =>
                            setForm((prev) => ({ ...prev, is_available: checked }))
                            }
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Short description shown in the menu"
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