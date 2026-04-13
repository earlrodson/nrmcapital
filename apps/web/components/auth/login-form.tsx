"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("admin@nrm.local")
  const [password, setPassword] = useState("admin123")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setPending(false)

    if (result?.error) {
      setError("Invalid credentials")
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <label className="block text-sm text-slate-700">
        Email
        <input
          type="email"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label className="block text-sm text-slate-700">
        Password
        <input
          type="password"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        disabled={pending}
        type="submit"
        className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  )
}
