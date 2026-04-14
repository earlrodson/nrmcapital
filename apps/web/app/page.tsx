import Link from "next/link"

import { FeaturesSection } from "@/components/landing/features-section"
import { HeroSection } from "@/components/landing/hero-section"
import { LandingFooter } from "@/components/landing/landing-footer"
import { LoanEstimator } from "@/components/landing/loan-estimator"
import { TestimonialsSection } from "@/components/landing/testimonials-section"

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50 text-slate-800">
      <main className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-12">
        <div className="mb-6 flex w-full justify-end">
          <Link
            href="/login"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-500 hover:text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            Login
          </Link>
        </div>
        <HeroSection />
        <LoanEstimator />
        <FeaturesSection />
        <TestimonialsSection />
      </main>
      <LandingFooter />
    </div>
  )
}
