import { ReactNode } from "react"
import Image from "next/image"
import { Sparkles, CheckCircle2 } from "lucide-react"

interface HeroSectionProps {
  calculator: ReactNode
}

export function HeroSection({ calculator }: HeroSectionProps) {
  return (
    <section className="relative mb-16 w-full lg:mb-24">
      <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Left Column: Calculator */}
        <div className="animate-fade-up delay-400 flex justify-center lg:justify-start lg:sticky lg:top-8">
          {calculator}
        </div>

        {/* Right Column: Text content & App Image */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="mb-6 w-full">
            <div className="animate-fade-up mb-6 flex justify-center lg:justify-start">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700 shadow-sm ring-1 ring-amber-200/50">
                <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                no hidden fees
              </p>
            </div>
            <h2 className="animate-fade-up delay-100 mb-4 text-3xl font-extrabold leading-tight tracking-tighter text-slate-950 drop-shadow-sm sm:text-4xl lg:text-5xl">
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Flexible</span>, transparent, and responsible lending solutions.
            </h2>
            <p className="animate-fade-up delay-200 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              From personal loans to business financing tailored to your needs.
            </p>
          </div>

          <div className="animate-fade-up delay-300 relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-full">
            {/* Decorative sparkles */}
            <Sparkles className="absolute -left-4 -top-4 hidden h-8 w-8 text-emerald-400/60 lg:block" />
            <Sparkles className="absolute -bottom-6 -right-6 hidden h-10 w-10 text-teal-400/50 lg:block" />

            {/* Main App Image */}
            <div className="relative z-10 flex justify-center lg:justify-start">
              <Image
                src="/images/mobiles-hero.png"
                alt="Hero Image"
                width={280}
                height={280}
                className="w-full h-full object-cover"
                priority
              />
            </div>

            {/* Floating Bubble 1 - Sharp & Large */}
            <div
              className="animate-float glass-panel absolute left-0 top-[30%] z-20 flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-4 py-2 shadow-lg backdrop-blur-md lg:-left-8"
              style={{ animationDelay: '1s', animationDuration: '6s' }}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-slate-800">Small Interest</span>
            </div>

            {/* Floating Bubble 2 - Soft Blur & Medium */}
            <div
              className="animate-float glass-panel absolute bottom-[30%] right-0 z-20 flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-3 py-1.5 shadow-lg backdrop-blur-sm lg:-right-4 scale-90 opacity-90"
              style={{ animationDelay: '2s', animationDuration: '8s' }}
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
              </div>
              <span className="text-xs font-semibold text-slate-800">Easy Process</span>
            </div>

            {/* Floating Bubble 3 - Deeper Blur & Small */}
            <div
              className="animate-float glass-panel absolute -left-4 top-[70%] z-20 flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-3 py-1.5 shadow-lg backdrop-blur-sm lg:-left-12 scale-75 opacity-80"
              style={{ animationDelay: '3s', animationDuration: '7s' }}
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
              </div>
              <span className="text-xs font-semibold text-slate-800">Fast Approval</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
