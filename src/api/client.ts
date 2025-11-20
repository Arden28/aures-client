// src/api/client.ts
import apiService, { type ApiResult } from "@/api/apiService"

export type RestaurantMini = {
  id: number
  name: string
}

export type Client = {
  id: number
  restaurant_id: number
  restaurant?: RestaurantMini | null
  name: string
  email?: string | null
  phone?: string | null
  external_id?: string | null
  created_at?: string
  updated_at?: string
}

export type ClientPayload = {
  name: string
  email?: string | null
  phone?: string | null
  external_id?: string | null
}

export type ClientFilters = {
  search?: string
  page?: number
}

type PaginationMeta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

type ClientIndexResponse =
  | {
      data: Client[]
      meta?: PaginationMeta
      links?: Record<string, string | null>
    }
  | Client[]

// Normalize both [ {...} ] and { data: [ {...} ] }
function normalizeClientIndex(payload: ClientIndexResponse) {
  if (Array.isArray(payload)) {
    return { items: payload as Client[], meta: undefined as PaginationMeta | undefined }
  }

  return {
    items: (payload.data ?? []) as Client[],
    meta: payload.meta,
  }
}

export async function fetchClients(filters?: ClientFilters) {
  const res = await apiService.get<ClientIndexResponse>("/v1/clients", {
    params: filters as Record<string, unknown> | undefined,
  })
  return normalizeClientIndex(res.data)
}

export async function createClient(body: ClientPayload) {
  const res = await apiService.post<Client, ClientPayload>("/v1/clients", body)
  return res.data
}

export async function updateClient(id: number, body: ClientPayload) {
  const res = await apiService.put<Client, ClientPayload>(`/v1/clients/${id}`, body)
  return res.data
}

export async function deleteClient(id: number) {
  const res = await apiService.delete<ApiResult<unknown>>(`/v1/clients/${id}`)
  return res
}
