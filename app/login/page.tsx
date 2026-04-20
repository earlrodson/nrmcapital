import { LoginForm } from "@/components/login/login-form"

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-primary/10 blur-[120px] animate-blob" />
        <div className="absolute top-[20%] -right-[10%] h-[50%] w-[50%] rounded-full bg-primary/5 blur-[150px] animate-blob delay-500" />
        <div className="absolute -bottom-[10%] left-[20%] h-[45%] w-[45%] rounded-full bg-primary/10 blur-[130px] animate-blob delay-1000" />
        <div className="bg-noise absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-up">
        <LoginForm />
      </div>
    </main>
  )
}
