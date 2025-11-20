// src/api/floor.ts
import apiService, { type ApiResult } from "@/api/apiService"

export type FloorTableMini = {
  id: number
  name?: string | null
}

export type FloorPlan = {
  id: number
  restaurant?: {
    id: number
    name: string
  } | null
  name: string
  status: string          // e.g. "active", "inactive" (match your enum)
  tables?: FloorTableMini[]
  created_at?: string
}

export type FloorPlanPayload = {
  name: string
  status?: string        // let backend default if omitted
}

type FloorIndexResponse =
  | {
      data: FloorPlan[]
    }
  | FloorPlan[]

// Handle both array and { data: [...] } API shapes
function normalizeList(payload: FloorIndexResponse): FloorPlan[] {
  if (Array.isArray(payload)) return payload as FloorPlan[]
  if (payload && Array.isArray(payload.data)) return payload.data as FloorPlan[]
  return []
}

export async function fetchFloorPlans(params?: { search?: string; status?: string }) {
  const res = await apiService.get<FloorIndexResponse>("/v1/floor-plans", {
    params: params as Record<string, unknown> | undefined,
  })
  return normalizeList(res.data)
}

export async function createFloorPlan(body: FloorPlanPayload) {
  const res = await apiService.post<FloorPlan, FloorPlanPayload>("/v1/floor-plans", body)
  return res.data
}

export async function updateFloorPlan(id: number, body: FloorPlanPayload) {
  const res = await apiService.put<FloorPlan, FloorPlanPayload>(`/v1/floor-plans/${id}`, body)
  return res.data
}

export async function deleteFloorPlan(id: number) {
  const res = await apiService.delete<ApiResult<unknown>>(`/v1/floor-plans/${id}`)
  return res
}
