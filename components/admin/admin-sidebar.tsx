"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { 
  Briefcase, 
  ChevronRight, 
  CreditCard, 
  LayoutDashboard, 
  PieChart, 
  Settings, 
  Users 
} from "lucide-react"

import { CONFIG } from "@/lib/config"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const { LABELS } = CONFIG

// Sample navigation data
const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Clients",
      url: "/admin/clients",
      icon: Users,
      isActive: false,
      items: [
        {
          title: "Active Clients",
          url: "/admin/clients?status=active",
        },
        {
          title: "Inactive Clients",
          url: "/admin/clients?status=inactive",
        },
        {
          title: LABELS.NEW_BORROWER,
          url: "/admin/clients/new",
        },
      ],
    },
    {
      title: "Loans",
      url: "/admin/loans",
      icon: Briefcase,
      isActive: false,
    },
    {
      title: "Payments",
      url: "/admin/payments",
      icon: CreditCard,
      isActive: false,
      items: [
        {
          title: "Summary",
          url: "/admin/payments/summary",
        },
        {
          title: "Transactions",
          url: "/admin/payments",
        },
      ],
    },
    {
      title: "Settings",
      url: "/admin/settings",
      icon: Settings,
      isActive: false,
      items: [
        {
          title: "Users",
          url: "/admin/settings/users",
        },
      ],
    },
  ],
}

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  
  // Initialize state based on current pathname to avoid effect sync issues
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const item of data.navMain) {
      if (item.items && pathname.startsWith(item.url)) {
        initial[item.title] = true
      }
    }
    return initial
  })

  // Synchronize when pathname changes, but only if not already open
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setOpenSections((previous) => {
        const next = { ...previous }
        let changed = false
        for (const item of data.navMain) {
          if (item.items && pathname.startsWith(item.url) && !next[item.title]) {
            next[item.title] = true
            changed = true
          }
        }
        return changed ? next : previous
      })
    }, 0)
    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/admin/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Briefcase className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">NRM Capital</span>
                <span className="truncate text-xs">Admin Portal</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarMenu>
            {data.navMain.map((item) => (
              item.items ? (
                <Collapsible
                  key={item.title}
                  open={Boolean(openSections[item.title])}
                  onOpenChange={(open) =>
                    setOpenSections((previous) => ({
                      ...previous,
                      [item.title]: open,
                    }))
                  }
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger
                      render={
                        <SidebarMenuButton tooltip={item.title}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      }
                    />
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton isActive={pathname === subItem.url} render={<Link href={subItem.url} />}>
                              <span>{subItem.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ) : (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton tooltip={item.title} isActive={pathname.startsWith(item.url)} render={<Link href={item.url} />}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
