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
        <div className="flex justify-center lg:justify-start lg:sticky lg:top-8">
          {calculator}
        </div>

        {/* Right Column: Text content & App Image */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="mb-10 w-full">
            <h2 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 drop-shadow-sm sm:text-3xl lg:text-4xl">
              Flexible, transparent, and responsible lending solutions.
            </h2>
            <p className="max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              From personal loans to business financing tailored to your needs. No hidden fees.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-full">
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

            {/* Floating Bubble 1 */}
            <div
              className="animate-float glass-panel absolute left-0 top-[10%] z-20 flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-4 py-2 shadow-lg backdrop-blur-md lg:-left-8"
              style={{ animationDelay: '1s', animationDuration: '6s' }}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-slate-800">Small Interest</span>
            </div>

            {/* Floating Bubble 2 */}
            <div
              className="animate-float glass-panel absolute bottom-[20%] right-0 z-20 flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-4 py-2 shadow-lg backdrop-blur-md lg:-right-4"
              style={{ animationDelay: '2s', animationDuration: '8s' }}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-slate-800">Easy Process</span>
            </div>

            {/* Floating Bubble 3 */}
            <div
              className="animate-float glass-panel absolute -left-4 top-[50%] z-20 flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-4 py-2 shadow-lg backdrop-blur-md lg:-left-12"
              style={{ animationDelay: '3s', animationDuration: '7s' }}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-slate-800">Fast Approval</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
