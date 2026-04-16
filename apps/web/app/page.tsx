import Link from "next/link"

import { FeaturesSection } from "@/components/landing/features-section"
import { HeroSection } from "@/components/landing/hero-section"
import { LandingFooter } from "@/components/landing/landing-footer"
import { LoanEstimator } from "@/components/landing/loan-estimator"
import { PoliciesSection } from "@/components/landing/policies-section"

export default function HomePage() {
  return (
    <div className="landing-glass-theme safe-area-top safe-area-bottom relative min-h-svh overflow-x-hidden bg-linear-to-b from-slate-100 via-slate-50 to-slate-100 text-slate-800">
      <main className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-8 sm:px-6 sm:py-10 md:py-12 lg:px-8 lg:py-14">
        <div className="mb-5 flex w-full justify-end sm:mb-6">
          <Link
            href="/login"
            className="swift-transition glass-panel rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-400 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-[0.99]"
          >
            Login
          </Link>
        </div>
        <HeroSection />
        <LoanEstimator />
        <FeaturesSection />
        <PoliciesSection />
      </main>
      <LandingFooter />
    </div>
  )
}
