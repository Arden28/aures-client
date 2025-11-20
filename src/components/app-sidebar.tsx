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

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Overview",
      url: "/",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Menus",
      url: "#",
      icon: EggFried,
      isActive: true,
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
    },
    {
      title: "Clients",
      url: "/clients",
      icon: UsersRound,
    },
    {
      title: "Staff",
      url: "/staff",
      icon: Users,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
