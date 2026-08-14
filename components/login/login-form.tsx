"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { User, Lock, Loader2, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface LoginSuccessResponse {
  success: true
  data: {
    userId: string
    role: "SUPERADMIN" | "ADMIN" | "CLIENT"
    email: string
    name: string
  }
  meta: null
  error: null
}

interface LoginErrorResponse {
  success: false
  data: null
  meta: null
  error: {
    code: string
    message: string
    details: Record<string, unknown> | null
  }
}

type LoginResponse = LoginSuccessResponse | LoginErrorResponse

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const form = e.currentTarget
    const identifier = (form.elements.namedItem("identifier") as HTMLInputElement).value.trim()
    const password = (form.elements.namedItem("password") as HTMLInputElement).value

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ identifier, password }),
      })

      const payload = (await response.json()) as LoginResponse
      if (!response.ok || !payload.success) {
        setError(payload.success ? "Login failed. Please try again." : payload.error.message)
        return
      }

      const destination = payload.data.role === "CLIENT" ? "/client/dashboard" : "/admin/dashboard"
      router.push(destination)
      router.refresh()
    } catch {
      setError("Unable to sign in right now. Please try again in a moment.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center space-y-2 text-center">
        <div className="relative h-16 w-16 mb-2 overflow-hidden rounded-xl bg-white p-2 shadow-sm border border-border/50">
          <Image
            src="/images/nrm-capital-logo.png"
            alt="NRM Capital Logo"
            fill
            className="object-contain p-1"
            priority
          />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your NRM Capital account
        </p>
      </div>

      <Card className="glass-panel-strong border-white/20 shadow-2xl overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Login</CardTitle>
          <CardDescription>Staff: sign in with your email. Clients: sign in with your Client Number.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="identifier" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Email or Client Number
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  placeholder="name@company.com or CL-0001"
                  className="pl-10 h-11 transition-all focus:ring-2 focus:ring-primary/20"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-10 h-11 transition-all focus:ring-2 focus:ring-primary/20"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {error ? (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="w-full h-11 font-medium text-base swift-transition" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col items-center space-y-4">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground swift-transition">
          &larr; Back to homepage
        </Link>
        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest text-center">
          &copy; {new Date().getFullYear()} NRM Capital. All rights reserved.
        </p>
      </div>
    </div>
  )
}
