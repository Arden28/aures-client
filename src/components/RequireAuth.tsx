import * as React from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import useAuth from "@/hooks/useAuth"

export default function RequireAuth() {
  const { status, isAuthenticated } = useAuth()
  const location = useLocation()

  // Wait until auth is resolved; don't flash or redirect
  if (status === "loading") return null

  if (!isAuthenticated) {
    // send them to login, but remember where they were going
    return <Navigate to="/auth/login" replace state={{ from: location }} />
  }

  // IMPORTANT: do not navigate anywhere here.
  return <Outlet />
}
