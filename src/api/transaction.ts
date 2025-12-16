// src/api/transaction.ts
import apiService from "@/api/apiService"

export type Transaction = {
  id: number
  amount: number
  method: string
  status: string
  processed_by?: any
  created_at: string
  order?: any
}

export type TransactionPayload = {
  table_session_id?: number | null
  order_ids?: number[] // Fallback for takeout
  amount: number
  payment_method: string
}

export async function fetchTransactions(params?: any) {
  const res = await apiService.get("/v1/transactions", { params })
  // Handle Laravel Pagination wrapping
//   if(res.data && res.data.data && Array.isArray(res.data.data)) {
//       return res.data.data as Transaction[]
//   }
  return (res.data as Transaction[]) || []
}

export async function createTransaction(body: TransactionPayload) {
  // POST /v1/transactions
  const res = await apiService.post("/v1/transactions", body)
  return res.data
}