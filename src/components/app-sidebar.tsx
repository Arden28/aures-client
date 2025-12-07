"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  EggFried,
  Frame,
  GalleryVerticalEnd,
  HandPlatter,
  LayoutDashboard,
  Map,
  PieChart,
  Settings,
  Settings2,
  SquareTerminal,
  Users,
  UsersRound,
  Utensils,
  UtensilsCrossed,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"

// Import auth hook to get current role

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Aures Manager",
      logo: HandPlatter,
      plan: "Restaurant",
    },
  ],
  // We define all items here, but we will filter them in the component
  navMain: [
    {
      title: "Overview",
      url: "/",
      icon: LayoutDashboard,
      isActive: true,
      // No roles array implies "public" (to authenticated users)
    },
    {
      title: "Menus",
      url: "#",
      icon: EggFried,
      isActive: true,
      roles: ["owner", "manager"], // Custom property for filtering
      items: [
        {
          title: "Categories",
          url: "/menu/categories",
        },
        {
          title: "Products",
          url: "/menu/products",
        },
      ],
    },
    {
      title: "Floors & Tables",
      url: "#",
      icon: HandPlatter,
      roles: ["owner", "manager"],
      items: [
        {
          title: "Floor Plans",
          url: "/floors",
        },
        {
          title: "Tables",
          url: "/tables",
        },
      ],
    },
    {
      title: "Orders",
      url: "/orders",
      icon: UtensilsCrossed,
      roles: ["owner", "manager"],
    },
    {
      title: "Clients",
      url: "/clients",
      icon: UsersRound,
      roles: ["owner", "manager"],
    },
    {
      title: "Staff",
      url: "/staff",
      icon: Users,
      roles: ["owner", "manager"],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      roles: ["owner", "manager"],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const userRole = user?.role || "waiter" // Default to restricted role if undefined

  // Filter navigation items based on role
  const filteredNavMain = React.useMemo(() => {
    return data.navMain.filter((item) => {
      // If the item has no specific 'roles' property, it's visible to everyone
      if (!item.roles) return true
      
      // Otherwise, check if the user's role is in the allowed list
      return item.roles.includes(userRole)
    })
  }, [userRole])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}