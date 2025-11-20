import * as React from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import useAuth from "@/hooks/useAuth"

export default function GuestOnly() {
  const { status, isAuthenticated } = useAuth()
  const location = useLocation()

  if (status === "loading") return null

  if (isAuthenticated) {
    const from = (location.state as any)?.from?.pathname || "/"
    // If user hits /auth/* while logged in, bounce them back
    return <Navigate to={from} replace />
  }

  return <Outlet />
}
