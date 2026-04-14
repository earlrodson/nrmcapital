import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { auth } from "@/lib/auth"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <Header title="NRM Lending" />
          <div className="mt-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
