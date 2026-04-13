import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function Dialog({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function DialogContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded border border-slate-200 bg-white p-4", className)}>{children}</div>
}
