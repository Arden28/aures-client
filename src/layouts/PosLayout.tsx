// src/layouts/PosLayout.tsx
"use client"

import * as React from "react"
import { Outlet, useNavigate } from "react-router-dom"
import useAuth from "@/hooks/useAuth"
import { Toaster } from "sonner"

/* -------------------------------------------------------------------------- */
/* Theme Hook                                                                 */
/* -------------------------------------------------------------------------- */

export function useThemeToggle() {
  const [theme, setTheme] = React.useState<"light" | "dark">("light")

  React.useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark")
    setTheme(isDark ? "dark" : "light")
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  return { theme, toggleTheme }
}

/* -------------------------------------------------------------------------- */
/* Main Layout Component                                                      */
/* -------------------------------------------------------------------------- */

export default function PosLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Redirect if not logged in (basic protection)
  React.useEffect(() => {
    if (!user) {
       // navigate("/login") // Uncomment in production
    }
  }, [user, navigate])

  return (
    <div className="flex min-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 transition-colors duration-300 text-slate-900 dark:text-slate-50 font-sans">
      
      {/* NO SIDEBAR. 
          The page content takes up 100% of width/height.
          Navigation is handled inside the specific pages (WaiterPage).
      */}
      
      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative">
          <Outlet />
      </main>

      <Toaster position="top-center" />
    </div>
  )
}