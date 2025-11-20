import { ChevronRight, type LucideIcon } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

type NavItem = {
  title: string
  url: string
  icon?: LucideIcon
  items?: {
    title: string
    url: string
  }[]
}

export function NavMain({ items }: { items: NavItem[] }) {
  const { pathname } = useLocation()

  const isPathActive = (url: string) => {
    if (!url) return false

    // special-case root/dashboard if you want
    if (url === "/") {
      return pathname === "/" || pathname === "/dashboard"
    }

    // exact or nested (e.g. /orders and /orders/123)
    return pathname === url || pathname.startsWith(url + "/")
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const hasChildren = item.items && item.items.length > 0
          const Icon = item.icon

          // parent active if current path matches parent url
          const parentActive = isPathActive(item.url)
          // child active if any child url matches
          const childActive = item.items?.some((child) => isPathActive(child.url)) ?? false
          const anyActive = parentActive || childActive

          // 👉 CASE 1: Simple link (NO dropdown)
          if (!hasChildren) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={parentActive}
                >
                  <NavLink to={item.url}>
                    {Icon && <Icon className="h-4 w-4" />}
                    <span>{item.title}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          // 👉 CASE 2: Dropdown (HAS children)
          return (
            <Collapsible
              key={item.title}
              asChild
              // use defaultOpen so user can still toggle, but it opens when current route is inside
              defaultOpen={anyActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={anyActive}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => {
                      const subActive = isPathActive(subItem.url)
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={subActive}
                          >
                            <NavLink to={subItem.url}>
                              <span>{subItem.title}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
