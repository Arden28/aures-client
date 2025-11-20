// src/api/product.ts
import apiService, { type ApiResult } from "@/api/apiService"

export type ProductCategoryMini = {
  id: number
  name: string
}

export type Product = {
  id: number
  restaurant_id: number
  category_id: number | null
  category?: ProductCategoryMini | null
  name: string
  description?: string | null
  price: number
  is_available: boolean
  sku?: string | null
  position?: number | null
  image_path?: string | null      // thumbnail path from backend
  created_at?: string
  updated_at?: string
}

export type ProductPayload = {
  name: string
  category_id?: number | null
  description?: string | null
  price: number
  is_available?: boolean
  sku?: string | null
  position?: number | null
}

export type ProductFilters = {
  search?: string
  category_id?: number
  available?: boolean
  page?: number
}

type PaginationMeta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

type ProductIndexResponse =
  | {
      data: Product[]
      meta?: PaginationMeta
      links?: Record<string, string | null>
    }
  | Product[]

function normalizeProductIndex(payload: ProductIndexResponse) {
  if (Array.isArray(payload)) {
    return { items: payload as Product[], meta: undefined as PaginationMeta | undefined }
  }

  return {
    items: (payload.data ?? []) as Product[],
    meta: payload.meta,
  }
}

export async function fetchProducts(filters?: ProductFilters) {
  const res = await apiService.get<ProductIndexResponse>("/v1/products", {
    params: filters as Record<string, unknown> | undefined,
  })
  return normalizeProductIndex(res.data)
}

export async function createProduct(body: ProductPayload) {
  const res = await apiService.post<Product, ProductPayload>("/v1/products", body)
  return res.data
}

export async function updateProduct(id: number, body: ProductPayload) {
  const res = await apiService.put<Product, ProductPayload>(`/v1/products/${id}`, body)
  return res.data
}

export async function deleteProduct(id: number) {
  const res = await apiService.delete<ApiResult<unknown>>(`/v1/products/${id}`)
  return res
}

// New helper: upload/replace product image (expects backend route)
export async function uploadProductImage(id: number, file: File) {
  const formData = new FormData()
  formData.append("image", file)

  const res = await apiService.post<Product, FormData>(
    `/v1/products/${id}/image`,
    formData
  )

  return res.data
}
