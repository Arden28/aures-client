"use client"

import * as React from "react"
import { Outlet } from "react-router-dom"
import { UtensilsCrossed, Wifi } from "lucide-react"

export default function PortalLayout() {
  return (
    <div className="min-h-screen w-full bg-muted/5 text-foreground font-sans selection:bg-primary/20">
      
      {/* Responsive Header */}
      <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-lg border-b border-border/50 supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-5xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          
          {/* Left: Brand */}
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg hidden sm:block tracking-tight">AuresMenu</span>
          </div>

          {/* Center: Context */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 border border-border/50 px-3 py-1 rounded-full bg-background/50">
              Table 12
            </span>
          </div>

          {/* Right: Status */}
          <div className="flex items-center gap-2">
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hidden sm:block">Live</span>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {/* CHANGED: Removed max-w-md, added max-w-5xl to allow desktop expansion */}
      <main className="mx-auto w-full max-w-5xl min-h-[calc(100vh-4rem)] bg-background sm:shadow-sm sm:border-x sm:border-border/40">
        <Outlet />
      </main>

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