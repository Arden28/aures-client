// src/app/pos/PosLayout.tsx
"use client"

import * as React from "react"
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom"
import {
  HandPlatter,
  ChevronDown,
  User,
  LogOut,
  Sun,
  Moon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import useAuth from "@/hooks/useAuth"

type PosRole = "waiter" | "cashier" | "kitchen"

type PosNavLink = {
  to: string
  label: string
}

/**
 * Simple internal hook to toggle theme class on document
 * If you use next-themes, replace this with: const { setTheme, theme } = useTheme()
 */
function useThemeToggle() {
  const [theme, setTheme] = React.useState<"light" | "dark">("light")

  React.useEffect(() => {
    // Check initial preference
    const isDark = document.documentElement.classList.contains("dark")
    setTheme(isDark ? "dark" : "light")
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    
    // Toggle tailwind class
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  return { theme, toggleTheme }
}

function getNavLinks(role: PosRole): PosNavLink[] {
  if (role === "kitchen") {
    return [
      { to: "/pos/kds", label: "Kitchen Display" },
      { to: "/pos/kds/history", label: "History" },
    ]
  }

  // waiter / cashier
  return [
    { to: "/pos/tables", label: "Tables" },
    { to: "/pos/register", label: "Register" },
    { to: "/pos/orders", label: "Orders" },
  ]
}

export default function PosLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { toggleTheme } = useThemeToggle()

  // Extract user details safely from the real auth object
  // We cast to any here to handle potential variations in the user object shape
  const role: PosRole = (user as any)?.role ?? "waiter"
  const userName = (user as any)?.name || (user as any)?.fullName || (user as any)?.username || "User"

  const navLinks = getNavLinks(role)
  const isKds = role === "kitchen"

  const handleLogout = async () => {
    await logout()
    navigate("/login") // Ensure redirect happens
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted">
      {/* Top nav */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border/40">
        <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
          {/* Logo + brand */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HandPlatter className="h-4 w-4" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">Aures POS</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {isKds ? "Kitchen Display" : "Restaurant Service"}
              </span>
            </div>
          </div>

          {/* Centered nav links (scrollable on mobile) */}
          <nav className="ml-4 flex-1">
            <div className="no-scrollbar flex items-center gap-1 overflow-x-auto rounded-full bg-muted/60 p-1 text-xs sm:text-[13px]">
              {navLinks.map((link) => (
                <PosNavLinkPill
                  key={link.to}
                  to={link.to}
                  label={link.label}
                  isActive={pathname.startsWith(link.to)}
                />
              ))}
            </div>
          </nav>

          {/* Right Actions: Theme + User */}
          <div className="ml-auto flex items-center gap-2">
            
            {/* Theme Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              onClick={toggleTheme}
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 rounded-full pl-2 pr-2.5 text-xs"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                    <User className="h-3.5 w-3.5" />
                  </span>
                  <span className="hidden sm:inline">
                    {userName}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 text-xs">
                <DropdownMenuLabel>
                  {userName}
                  <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground capitalize">
                    {role}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuItem>
                  <User className="mr-2 h-3 w-3" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={handleLogout}>
                  <LogOut className="mr-2 h-3 w-3" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 justify-center">
        <div className="flex w-full flex-col">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

/* ------------- Sub-components ------------- */

type PosNavLinkPillProps = {
  to: string
  label: string
  isActive: boolean
}

function PosNavLinkPill({ to, label, isActive }: PosNavLinkPillProps) {
  return (
    <NavLink to={to} className="shrink-0">
      <div
        className={cn(
          "flex items-center rounded-lg px-3 py-1.5 transition-colors",
          "text-[14px] font-medium sm:text-md",
          isActive
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:bg-background/70"
        )}
      >
        {label}
      </div>
    </NavLink>
  )
}