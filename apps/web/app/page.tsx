import { FeaturesSection } from "@/components/landing/features-section"
import { HeroSection } from "@/components/landing/hero-section"
import { LandingFooter } from "@/components/landing/landing-footer"
import { LoanEstimator } from "@/components/landing/loan-estimator"
import { TestimonialsSection } from "@/components/landing/testimonials-section"

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50 text-slate-800">
      <main className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-12">
        <HeroSection />
        <LoanEstimator />
        <FeaturesSection />
        <TestimonialsSection />
      </main>
      <LandingFooter />
    </div>
  )
}
