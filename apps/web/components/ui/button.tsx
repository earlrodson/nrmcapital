import type { ButtonHTMLAttributes } from "react"

import { cn } from "@/lib/utils"

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn("rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white", className)}
      {...props}
    />
  )
}
