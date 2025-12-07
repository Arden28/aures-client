"use client"

import * as React from "react"
import { ChevronsUpDown } from "lucide-react" // Keep the icon

import {
  // Removed unused Dropdown imports
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

// NOTE: The 'teams' prop is no longer needed since team switching is removed,
// but we'll use a functional component structure.

/**
 * Renders the responsive logo area in the sidebar header.
 * Displays the full logo when expanded, and the icon logo when collapsed.
 * Retains the ChevronsUpDown icon for visual consistency/indicator.
 */
export function TeamSwitcher() {
  const { isMobile } = useSidebar()
  
  // NOTE: Assuming '/images/logo-icon.png' is your small iconed logo 
  // and '/images/logo.png' is the full wordmark logo.
  const fullLogoPath = "/images/logo.png"
  const iconLogoPath = "/images/logo.png" // Placeholder for your secondary/icon logo

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {/* We keep the SidebarMenuButton to maintain layout and styling */}
        <SidebarMenuButton
          size="sm"
          // We remove data-[state=open] styles as there is no 'open' state anymore
          className="hover:bg-sidebar-accent/10 cursor-default" 
        >
          
          {isMobile ? (
            // 1. Collapsed State: Show icon-only logo
            <div className="bg-sidebar-primary/10 flex aspect-square size-8 items-center justify-center rounded-lg">
              <img 
                src={iconLogoPath} // Use the icon logo here
                alt="Tapla Icon" 
                className="size-5 object-contain" 
              />
            </div>
          ) : (
            // 2. Expanded State: Show full logo and chevron icon
            <>
              <div className="grid flex-1 text-left leading-tight">
                <img 
                  src={fullLogoPath} // Use the full wordmark logo here
                  alt="Tapla Logo" 
                  className="h-6 w-auto object-contain" 
                />
              </div>
              <ChevronsUpDown className="ml-auto opacity-70" />
            </>
          )}
          
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}