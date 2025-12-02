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

// Map each role to its home route
const roleRedirect: Record<AllowedRole, string> = {
  owner: "/dashboard",
  manager: "/dashboard",
  waiter: "/waiter",
  cashier: "/cashier",
  kitchen: "/kitchen",
  client: "/portal", // or wherever clients go
}

export default function RequireRole({ allowed }: RequireRoleProps) {
  const { user, status } = useAuth()
  const location = useLocation()

  const isLoading = status === "loading"
  if (isLoading) return null

  // No user → redirect to login
  if (!user) {
    return (
      <Navigate
        to="/auth/login"
        replace
        state={{ from: location }}
      />
    )
  }

  const role = user.role as AllowedRole

  // Role is not allowed here → send them to THEIR correct home page
  if (!allowed.includes(role)) {
    return <Navigate to={roleRedirect[role]} replace />
  }

  // Role allowed → render this route
  return <Outlet />
}
