import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"

import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { auth } from "@/lib/auth"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth()

  if (!session?.user?.id || !session.user.role) {
    redirect("/login")
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { is_active: true, role: true },
  })

  if (!currentUser?.is_active || currentUser.role !== session.user.role) {
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
