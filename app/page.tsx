import Link from "next/link"
import Image from "next/image"

import { FeaturesSection } from "@/components/landing/features-section"
import { HeroSection } from "@/components/landing/hero-section"
import { LandingFooter } from "@/components/landing/landing-footer"
import { LoanEstimator } from "@/components/landing/loan-estimator"
import { PoliciesSection } from "@/components/landing/policies-section"

export default function HomePage() {
  return (
    <div className="landing-glass-theme safe-area-top safe-area-bottom relative min-h-svh overflow-x-hidden text-slate-900">
      {/* Abstract Geometric Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-slate-50">
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        
        {/* Abstract Geometric Shapes */}
        <div className="absolute -top-24 -right-24 w-[500px] h-[500px] bg-gradient-to-br from-emerald-200/50 to-teal-100/30 rounded-[4rem] rotate-12 blur-sm"></div>
        <div className="absolute top-[30%] -left-32 w-[600px] h-[600px] bg-gradient-to-tr from-emerald-100/50 to-slate-200/30 rounded-full blur-md"></div>
        <div className="absolute -bottom-48 right-[15%] w-[800px] h-[400px] bg-gradient-to-tl from-teal-200/40 to-emerald-100/40 rounded-[5rem] -rotate-6 blur-sm"></div>
        
        {/* Light frosted overlay to blend shapes softly */}
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px]"></div>
      </div>
      
      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-8 sm:px-6 sm:py-10 md:py-12 lg:px-8 lg:py-14">
        {/* Header Row: Logo & Login */}
        <div className="mb-8 flex w-full items-center justify-between sm:mb-12">
          <div className="flex items-center gap-3">
            <Image
              src="/images/nrm-capital-logo.png"
              alt="NRM Capital"
              width={160}
              height={40}
              priority
              className="h-auto w-auto max-w-[120px] sm:max-w-[140px] md:max-w-[160px]"
            />
          </div>
          <Link
            href="/login"
            className="swift-transition glass-panel rounded-full px-8 py-3 text-base font-bold tracking-tight text-slate-800 hover:border-emerald-500 hover:bg-white/50 hover:text-emerald-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-[0.98]"
          >
            Login
          </Link>
        </div>

        <HeroSection />
        <LoanEstimator />
        <FeaturesSection />
        <PoliciesSection />
        <LandingFooter />
      </main>
    </div>
  )
}
