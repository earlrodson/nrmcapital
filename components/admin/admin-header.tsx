"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Bell, Search, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function AdminHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { setTheme, theme } = useTheme()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  const isDashboard = pathname === "/admin/dashboard"
  
  // Basic logic to generate breadcrumbs from pathname
  const paths = pathname.split("/").filter(Boolean)
  const breadcrumbPaths = paths.map((path, index) => {
    const href = "/" + paths.slice(0, index + 1).join("/")
    return {
      name: path.charAt(0).toUpperCase() + path.slice(1),
      href,
      isLast: index === paths.length - 1
    }
  })

  async function handleLogout() {
    if (isLoggingOut) {
      return
    }

    setIsLoggingOut(true)

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
      })
    } finally {
      router.replace("/login")
      router.refresh()
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 md:px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        
        {!isDashboard && breadcrumbPaths.length > 0 && (
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbPaths.map((bp) => (
                <React.Fragment key={bp.href}>
                  <BreadcrumbItem className="hidden md:block">
                    {bp.isLast ? (
                      <BreadcrumbPage>{bp.name}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={bp.href}>{bp.name}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!bp.isLast && (
                    <BreadcrumbSeparator className="hidden md:block" />
                  )}
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}
      </div>

      <div className="ml-auto flex items-center gap-4">
        <div className="relative hidden sm:block w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-full rounded-lg bg-background pl-8 focus-visible:ring-1"
          />
        </div>

        <Popover>
          <PopoverTrigger render={
            <Button variant="ghost" size="icon" className="relative rounded-full">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-primary" />
              <span className="sr-only">Notifications</span>
            </Button>
          } />
          <PopoverContent align="end" className="w-80">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-sm font-semibold">Notifications</span>
              </div>
              <Separator />
              <div className="flex flex-col gap-1 p-2 text-sm">
                <span className="text-muted-foreground">No new notifications.</span>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="rounded-full"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" alt="Admin" />
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
            </Button>
          } />
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Admin User</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    admin@nrmcapital.com
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/admin/settings/profile" />}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void handleLogout()} disabled={isLoggingOut}>
                {isLoggingOut ? "Logging out..." : "Log out"}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
