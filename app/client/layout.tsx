"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { LogOut, Loader2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"

interface MeResponse {
  success: boolean
  data: { userId: string; role: string; email: string; name: string } | null
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = React.useState(false)

  // proxy.ts already guarantees only an authenticated CLIENT session reaches this layout,
  // so this query is just for display (name in the header) — no redirect-on-error needed here.
  const meQuery = useQuery({
    queryKey: ["client", "me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me")
      const payload = (await res.json()) as MeResponse
      if (!res.ok || !payload.success || !payload.data) {
        throw new Error("UNAUTHENTICATED")
      }
      return payload.data
    },
    retry: false,
  })

  async function handleLogout() {
    setLoggingOut(true)
    await fetch("/api/auth/logout", { method: "POST" })
    router.replace("/login")
    router.refresh()
  }

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-[radial-gradient(circle_at_top,rgba(21,128,61,0.14),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,245,1))] dark:bg-[radial-gradient(circle_at_top,rgba(21,128,61,0.1),transparent_36%),linear-gradient(180deg,rgba(0,0,0,0.98),rgba(10,15,12,1))]">
      <header className="flex items-center justify-between border-b border-border/50 bg-background/50 px-4 py-3 backdrop-blur-sm md:px-8">
        <div className="flex items-center gap-2">
          <div className="relative h-8 w-8 overflow-hidden rounded-md bg-white p-1 shadow-sm border border-border/50">
            <Image src="/images/nrm-capital-logo.png" alt="NRM Capital" fill className="object-contain" />
          </div>
          <span className="font-semibold text-sm">NRM Capital</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">{meQuery.data?.name}</span>
          <Button variant="outline" size="lg" className="h-10 px-3" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            <span className="ml-2">Sign out</span>
          </Button>
        </div>
      </header>
      <main className="p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  )
}
