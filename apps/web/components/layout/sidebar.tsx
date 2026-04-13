import Link from "next/link"

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/loans", label: "Loans" },
  { href: "/investors", label: "Investors" },
  { href: "/reports", label: "Reports" },
  { href: "/settings/users", label: "Users" },
]

export function Sidebar() {
  return (
    <aside className="min-h-screen w-64 border-r border-slate-200 bg-white p-4">
      <p className="mb-6 text-lg font-semibold">NRM Lending</p>
      <nav className="space-y-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
