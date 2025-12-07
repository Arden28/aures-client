"use client"

import * as React from "react"
import { Outlet, useSearchParams } from "react-router-dom"
import { UtensilsCrossed, Menu as MenuIcon, Wifi } from "lucide-react" // Added MenuIcon
import { Toaster } from "sonner"

export default function PortalLayout() {
  const [searchParams] = useSearchParams()
  const tableCode = searchParams.get("table")

  // State to handle the open/close of the menu (for responsiveness)
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)

  return (
    <div className="min-h-screen w-full bg-muted/5 text-foreground font-sans selection:bg-primary/20">
      
      {/* Responsive Header */}
      <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-lg border-b border-border/50 supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-5xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          
          {/* Left: Stylized Logo (Main Brand Color) */}
          <div className="flex items-center gap-2">
            {/* Placeholder for Tapla Logo. Uses primary color for a subtle accent. */}
            <div className="flex items-center">
              {/* Using a placeholder div for the logo image */}
              <div className="h-6 mr-1">
                {/* Replace this div with your actual image tag for the logo */}
                <img 
                  src="/images/logo.png" // IMPORTANT: Use your actual logo path
                  alt="Tapla Logo" 
                  className="h-full w-full object-contain" 
                />
              </div>
              {/* <span className="font-extrabold text-xl tracking-tighter text-primary">Tapla</span> */}
            </div>
          </div>

          {/* Center: Context */}
          {/* <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 border border-border/50 px-3 py-1 rounded-full bg-background/50">
              {tableCode ? `${tableCode}` : "No Table"}
            </span>
          </div> */}

          {/* Right: Status and Menu Button */}
          <div className="flex items-center gap-4">
            {/* Live Status (Keep original green) */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hidden sm:block">Live</span>
            </div>

            {/* Tapla Menu Button (Uses Secondary Brand Color) - Visible on small screens */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="sm:hidden p-2 rounded-full text-secondary hover:bg-secondary/10 transition-colors"
              aria-label="Toggle Menu"
            >
              <MenuIcon className="h-6 w-6" />
            </button>
            
            {/* Placeholder for the actual Tapla Menu (Hidden on small screens) */}
            <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-secondary hover:text-secondary/80 transition-colors cursor-pointer">
                <UtensilsCrossed className="h-5 w-5" />
                {/* <span>Tapla Menu</span> */}
            </div>
          </div>
        </div>
      </header>
      
      {/* Responsive Menu Overlay (Hidden for now, but structure is ready) */}
      {isMenuOpen && (
        <div className="sm:hidden fixed inset-0 top-16 z-30 bg-background/95 backdrop-blur-sm p-4 border-b border-border/50">
          <nav className="flex flex-col space-y-2">
            {/* Add your mobile menu links here, e.g., */}
            <a href="#" className="p-3 rounded-md bg-secondary/5 text-secondary font-medium hover:bg-secondary/10">Home</a>
            <a href="#" className="p-3 rounded-md hover:bg-muted font-medium">Contact Staff</a>
            {/* ... other menu items */}
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-5xl min-h-[calc(100vh-4rem)] bg-background sm:shadow-sm sm:border-x sm:border-border/40">
        <Outlet />
      </main>

      <Toaster />

      {/* Footer */}
      <footer className="py-8 text-center w-full border-t border-border/40 bg-muted/20">
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/50 uppercase tracking-widest font-bold">
          <span>Powered by Aures</span>
          <Wifi className="h-3 w-3" />
        </div>
      </footer>
    </div>
  )
}