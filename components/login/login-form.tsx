"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

/** Demo-only credentials (no real auth). */
const DEMO_EMAIL = "demo@nrmcapital.com"
const DEMO_PASSWORD = "demo123"

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim()
    const password = (form.elements.namedItem("password") as HTMLInputElement).value

    if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
      try {
        sessionStorage.setItem("nrm-demo-session", "1")
      } catch {
        /* ignore quota / private mode */
      }
      router.push("/admin/dashboard")
      router.refresh()
      return
    }

    setError("Invalid email or password. Use the sample credentials shown as placeholders.")
  }

  return (
    <Card className="w-full max-w-md glass-panel">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold tracking-tight">Login</CardTitle>
        <CardDescription>Sign in to access the admin dashboard.</CardDescription>
        <p className="text-xs text-muted-foreground pt-1">
          Sample login: <span className="font-medium text-foreground/80">{DEMO_EMAIL}</span> /{" "}
          <span className="font-medium text-foreground/80">{DEMO_PASSWORD}</span>
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder={DEMO_EMAIL}
              defaultValue=""
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder={DEMO_PASSWORD}
              required
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Back to{" "}
          <Link href="/" className="text-primary hover:underline">
            home
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
