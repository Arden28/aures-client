// src/api/table.ts
import apiService, { type ApiResult } from "@/api/apiService"

export type TableStatus = "free" | "reserved" | "occupied" | "needs_cleaning"

export type RestaurantMini = {
  id: number
  name: string
}

export type FloorPlanMini = {
  id: number
  name: string
}

export type Table = {
  id: number
  name: string
  code: string
  capacity: number
  status: TableStatus
  qr_token: string
  restaurant?: RestaurantMini | null
  floor_plan?: FloorPlanMini | null
}

export type TablePayload = {
  name: string
  capacity: number
  floor_plan_id?: number | null
}

type TableIndexResponse =
  | {
      data: Table[]
    }
  | Table[]

// Normalize both [ {…}, {…} ] and { data: [ {…}, … ] }
function normalizeList(payload: TableIndexResponse): Table[] {
  if (Array.isArray(payload)) return payload as Table[]
  if (payload && Array.isArray(payload.data)) return payload.data as Table[]
  return []
}

export async function fetchTables() {
  const res = await apiService.get<TableIndexResponse>("/v1/tables")
  return normalizeList(res.data)
}

export async function createTable(body: TablePayload) {
  const res = await apiService.post<Table, TablePayload>("/v1/tables", body)
  return res.data
}

export async function updateTable(id: number, body: TablePayload) {
  const res = await apiService.put<Table, TablePayload>(`/v1/tables/${id}`, body)
  return res.data
}

export async function deleteTable(id: number) {
  const res = await apiService.delete<ApiResult<unknown>>(`/v1/tables/${id}`)
  return res
}

// Optional helper if you later want to drive the state machine from UI
export async function updateTableStatus(id: number, status: TableStatus) {
  const res = await apiService.patch<Table, { status: TableStatus }>(
    `/v1/tables/${id}/status`,
    { status }
  )
  return res.data
}

export async function closeTableSession(tableCode: string, sessionId: number) {
  await apiService.post(`/v1/tables/${tableCode}/sessions/${sessionId}/close`)
}

