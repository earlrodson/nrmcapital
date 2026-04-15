import { Suspense } from "react"
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-xl font-semibold">Sign in</h1>
        <Suspense fallback={<p className="text-sm text-slate-500">Loading...</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
