import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl flex items-center justify-center py-24 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />
      <span className="text-sm">Loading client…</span>
    </div>
  )
}
