// src/api/staff.ts
import apiService, { type ApiResult } from "@/api/apiService"

export type StaffRole =
  | "owner"
  | "manager"
  | "waiter"
  | "kitchen"
  | "cashier"
  | "client"

export type Staff = {
  id: number
  restaurant_id: number
  name: string
  email?: string | null
  role: StaffRole
  created_at?: string
  updated_at?: string
}

export type StaffPayload = {
  name: string
  email?: string | null
  role: StaffRole
  password?: string // required on create, optional on update
}

export type StaffFilters = {
  search?: string
  role?: StaffRole
  page?: number
}

type PaginationMeta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

type StaffIndexResponse =
  | {
      data: Staff[]
      meta?: PaginationMeta
      links?: Record<string, string | null>
    }
  | Staff[]

// Normalize both array and resource collection
function normalizeStaffIndex(payload: StaffIndexResponse) {
  if (Array.isArray(payload)) {
    return { items: payload as Staff[], meta: undefined as PaginationMeta | undefined }
  }

  return {
    items: (payload.data ?? []) as Staff[],
    meta: payload.meta,
  }
}

export async function fetchStaff(filters?: StaffFilters) {
  const res = await apiService.get<StaffIndexResponse>("/v1/staff", {
    params: filters as Record<string, unknown> | undefined,
  })
  return normalizeStaffIndex(res.data)
}

export async function createStaff(body: StaffPayload) {
  const res = await apiService.post<Staff, StaffPayload>("/v1/staff", body)
  return res.data
}

export async function updateStaff(id: number, body: StaffPayload) {
  const res = await apiService.put<Staff, StaffPayload>(`/v1/staff/${id}`, body)
  return res.data
}

export async function deleteStaff(id: number) {
  const res = await apiService.delete<ApiResult<unknown>>(`/v1/staff/${id}`)
  return res
}
