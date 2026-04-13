"use client"

import { signOut } from "next-auth/react"

export function LogoutButton() {
  return (
    <button
      type="button"
      className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      Logout
    </button>
  )
}
