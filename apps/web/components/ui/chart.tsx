import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function ChartContainer({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded border border-slate-200 bg-white p-4", className)}>{children}</div>
}
