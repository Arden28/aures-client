// src/api/category.ts
import apiService, { type ApiResult } from "@/api/apiService"

export type Category = {
  id: number
  name: string
  position: number
  is_active: boolean
  slug?: string | null
  created_at?: string
  updated_at?: string
}

export type CategoryPayload = {
  name: string
  position?: number
  is_active?: boolean
}

// Handle both array and { data: [...] } API shapes
function normalizeList(payload: any): Category[] {
  if (Array.isArray(payload)) return payload as Category[]
  if (payload && Array.isArray(payload.data)) return payload.data as Category[]
  return []
}

export async function fetchCategories(params?: { search?: string }) {
  const res = await apiService.get<any>("/v1/categories", {
    params: params as Record<string, unknown> | undefined,
  })
  return normalizeList(res.data)
}

export async function createCategory(body: CategoryPayload) {
  const res = await apiService.post<Category, CategoryPayload>("/v1/categories", body)
  return res.data
}

export async function updateCategory(id: number, body: CategoryPayload) {
  const res = await apiService.put<Category, CategoryPayload>(`/v1/categories/${id}`, body)
  return res.data
}

export async function deleteCategory(id: number) {
  const res = await apiService.delete<ApiResult<unknown>>(`/v1/categories/${id}`)
  return res
}
