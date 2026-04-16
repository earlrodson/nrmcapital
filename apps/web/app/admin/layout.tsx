import * as React from "react"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminHeader } from "@/components/admin/admin-header"
import { SidebarProvider } from "@workspace/ui/components/sidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <div className="flex w-full flex-col min-h-svh bg-[radial-gradient(circle_at_top,rgba(21,128,61,0.14),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,245,1))] dark:bg-[radial-gradient(circle_at_top,rgba(21,128,61,0.1),transparent_36%),linear-gradient(180deg,rgba(0,0,0,0.98),rgba(10,15,12,1))]">
        <AdminHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}
