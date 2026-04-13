import { LogoutButton } from "@/components/shared/logout-button"

export function Header({ title }: { title: string }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 pb-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      <LogoutButton />
    </header>
  )
}
