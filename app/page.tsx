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
      {/* Abstract Animated Geometric Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-slate-100">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        
        {/* Animated Blobs */}
        <div className="animate-blob absolute -top-24 -right-24 w-[500px] h-[500px] bg-gradient-to-br from-emerald-300/40 to-slate-400/30 rounded-[4rem] rotate-12 blur-2xl"></div>
        <div className="animate-blob absolute top-[30%] -left-32 w-[600px] h-[600px] bg-gradient-to-tr from-slate-300/40 to-emerald-200/30 rounded-full blur-3xl" style={{ animationDelay: '2s' }}></div>
        <div className="animate-blob absolute -bottom-48 right-[15%] w-[800px] h-[400px] bg-gradient-to-tl from-teal-300/30 to-slate-400/20 rounded-[5rem] -rotate-6 blur-2xl" style={{ animationDelay: '4s' }}></div>
        
        {/* Tactile Noise Texture Overlay */}
        <div className="bg-noise absolute inset-0 mix-blend-overlay"></div>

        {/* Frosted Glass Overlay */}
        <div className="absolute inset-0 bg-white/30 backdrop-blur-[4px]"></div>
      </div>
      
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-4 py-8 sm:px-6 sm:py-10 md:py-12 lg:px-8 lg:py-14">
        {/* Header Row: Logo & Login */}
        <div className="animate-fade-up mb-12 flex w-full items-center justify-between sm:mb-16">
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

        {/* Hero Section Grid (Calculator Left, App Right) */}
        <HeroSection calculator={<LoanEstimator />} />
        
        <FeaturesSection />
        <PoliciesSection />
        <LandingFooter />
      </main>
    </div>
  )
}
