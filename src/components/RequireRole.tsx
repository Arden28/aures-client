// src/components/RequireRole.tsx
import * as React from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import useAuth from "@/hooks/useAuth"

type AllowedRole =
  | "owner"
  | "manager"
  | "waiter"
  | "kitchen"
  | "cashier"
  | "client"

type RequireRoleProps = {
  allowed: AllowedRole[]
}

/**
 * RequireRole
 * - assumes the user is already authenticated (wrap inside <RequireAuth />)
 * - if role not allowed -> redirect to /dashboard
 */
export default function RequireRole({ allowed }: RequireRoleProps) {
  const { user, status } = useAuth()
  const location = useLocation()

  const isLoading = status === "loading"

  if (isLoading) return null

  // If somehow no user, send them to login
  if (!user) {
    return (
      <Navigate
        to="/auth/login"
        replace
        state={{ from: location }}
      />
    )
  }

  const role = user.role as AllowedRole | undefined

  // If role is missing or not in allowed list → bounce to dashboard
  if (!role || !allowed.includes(role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
