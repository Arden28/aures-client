"use client"
import * as React from "react"
import { Outlet, Link, useLocation } from "react-router-dom"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Toaster } from "sonner"


function useBreadcrumbs() {
  const { pathname } = useLocation()
  const segments = pathname.split("/").filter(Boolean)

  // Treat both "/" and "/dashboard" as the same root dashboard page
  const isDashboard =
    segments.length === 0 || (segments.length === 1 && segments[0] === "dashboard")

  if (isDashboard) {
    return { items: [] as { href: string; label: string; isLast: boolean }[], hasItems: false }
  }

  /**
   * Map known paths directly to a single, UX-friendly label.
   * This is where we make `/menu/products` -> "Products", etc.
   */
  const pathLabelMap: Record<string, string> = {
    "/menu/products": "Products",
    "/menu/categories": "Categories",
    "/floors": "Floor Plans",
    "/tables": "Tables",
    "/orders": "Orders",
    "/clients": "Clients",
    "/staff": "Staff",
    "/settings": "Settings",
  }

  const directLabel = pathLabelMap[pathname]
  if (directLabel) {
    return {
      items: [
        {
          href: pathname,
          label: directLabel,
          isLast: true,
        },
      ],
      hasItems: true,
    }
  }

  /**
   * Fallback: derive labels from segments (for routes we haven't registered above).
   * Example: /reports/overview -> Dashboard > Reports > Overview (if you want).
   */
  const routeLabelMap: Record<string, string> = {
    products: "Products",
    modules: "Modules",
    assessments: "Assessments",
    evaluate: "Evaluate",
    reports: "Reports",
    account: "My Account",
  }

  const prettify = (s: string) =>
    routeLabelMap[s] ??
    s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

  const items = segments.map((seg, idx) => ({
    href: "/" + segments.slice(0, idx + 1).join("/"),
    label: prettify(seg),
    isLast: idx === segments.length - 1,
  }))

  return { items, hasItems: items.length > 0 }
}

export default function AppLayout() {

  const { items, hasItems } = useBreadcrumbs()
  const { pathname } = useLocation()
  const isDashboard = pathname === "/"

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />

            <Breadcrumb>
              <BreadcrumbList>
                {/* Dashboard link only if we're NOT on dashboard */}
                {!isDashboard && (
                  <>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink asChild>
                        <Link to="/">Dashboard</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {hasItems && <BreadcrumbSeparator className="hidden md:block" />}
                  </>
                )}

                {hasItems ? (
                  items.map((it, i) =>
                    it.isLast ? (
                      <BreadcrumbItem key={i}>
                        <BreadcrumbPage>{it.label}</BreadcrumbPage>
                      </BreadcrumbItem>
                    ) : (
                      <React.Fragment key={i}>
                        <BreadcrumbItem className="hidden md:block">
                          <BreadcrumbLink asChild>
                            <Link to={it.href}>{it.label}</Link>
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="hidden md:block" />
                      </React.Fragment>
                    )
                  )
                ) : (
                  isDashboard && (
                    <BreadcrumbItem>
                      <BreadcrumbPage>Dashboard</BreadcrumbPage>
                    </BreadcrumbItem>
                  )
                )}
              </BreadcrumbList>
            </Breadcrumb>
            
          </div>
        </header>
        <Toaster />

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
