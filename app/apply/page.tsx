import Image from "next/image"
import Link from "next/link"

import { ApplyLoanForm } from "./apply-loan-form"

type ApplyPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getString(param: string | string[] | undefined) {
  if (Array.isArray(param)) return param[0]
  return param
}

function getNumber(param: string | string[] | undefined, fallback: number) {
  const value = Number(getString(param))
  if (!Number.isFinite(value) || value <= 0) return fallback
  return value
}

export default async function ApplyPage({ searchParams }: ApplyPageProps) {
  const params = await searchParams

  return (
    <div className="landing-glass-theme safe-area-top safe-area-bottom relative min-h-svh overflow-x-hidden text-slate-900">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-slate-100">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)", backgroundSize: "32px 32px" }}></div>
        <div className="animate-blob absolute -top-24 -right-24 w-[500px] h-[500px] bg-gradient-to-br from-emerald-300/40 to-slate-400/30 rounded-[4rem] rotate-12 blur-2xl"></div>
        <div className="animate-blob absolute top-[30%] -left-32 w-[600px] h-[600px] bg-gradient-to-tr from-slate-300/40 to-emerald-200/30 rounded-full blur-3xl" style={{ animationDelay: "2s" }}></div>
        <div className="bg-noise absolute inset-0 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-white/30 backdrop-blur-[4px]"></div>
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-4 py-8 sm:px-6 sm:py-10 md:py-12 lg:px-8 lg:py-14">
        <div className="animate-fade-up mb-10 flex w-full items-center justify-between sm:mb-12">
          <Image
            src="/images/nrm-capital-logo.png"
            alt="NRM Capital"
            width={160}
            height={40}
            priority
            className="h-auto w-auto max-w-[120px] sm:max-w-[140px] md:max-w-[160px]"
          />
          <Link
            href="/"
            className="swift-transition glass-panel rounded-full px-6 py-2 text-sm font-bold tracking-tight text-slate-800 hover:border-emerald-500 hover:bg-white/50 hover:text-emerald-700 hover:shadow-lg"
          >
            Back to Home
          </Link>
        </div>

        <ApplyLoanForm
          initialPrincipal={getNumber(params.principal, 20000)}
          initialMonths={getNumber(params.months, 6)}
          initialPaymentFrequency={getString(params.paymentFrequency)}
          initialMonthlyInterestRate={getNumber(params.monthlyInterestRate, 7)}
        />
      </main>
    </div>
  )
}
