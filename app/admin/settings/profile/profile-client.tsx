"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface MeResponse {
  success: boolean
  data?: {
    userId: string
    role: "SUPERADMIN" | "ADMIN" | "CLIENT"
    email: string
    name: string
  }
  error?: {
    message?: string
  }
}

export function ProfileClient() {
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState("")
  const [name, setName] = React.useState("")

  React.useEffect(() => {
    let active = true
    async function loadProfile() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/auth/me")
        const payload: MeResponse = await response.json()
        if (!active) return
        if (!payload.success || !payload.data) {
          setError(payload.error?.message || "Failed to load profile.")
          return
        }
        setEmail(payload.data.email)
        setRole(payload.data.role)
        setName(payload.data.name)
      } catch {
        if (!active) return
        setError("An error occurred while loading profile.")
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadProfile()
    return () => {
      active = false
    }
  }, [])

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      const payload: MeResponse = await response.json()
      if (!payload.success || !payload.data) {
        setError(payload.error?.message || "Failed to update profile.")
        return
      }
      setName(payload.data.name)
      setSuccess("Profile updated.")
    } catch {
      setError("An error occurred while updating profile.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your personal account details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account identity and display information.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSave}>
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={role} disabled />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {success ? <p className="text-sm text-green-600 dark:text-green-400">{success}</p> : null}

            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
