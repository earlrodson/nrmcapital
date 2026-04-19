import { Sparkles, CheckCircle2 } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative mb-12 w-full sm:mb-14 lg:mb-16">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12">
        {/* Left Column: Text content */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <h2 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 drop-shadow-sm sm:text-4xl lg:text-5xl">
            Flexible, transparent, and responsible lending solutions.
          </h2>
          <p className="mb-8 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            From personal loans to business financing tailored to your needs. No hidden fees.
          </p>
        </div>

        {/* Right Column: Image and floating bubbles */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-full">
          {/* Decorative sparkles */}
          <Sparkles className="absolute -left-4 -top-4 hidden h-8 w-8 text-emerald-400/60 lg:block" />
          <Sparkles className="absolute -bottom-6 -right-6 hidden h-10 w-10 text-teal-400/50 lg:block" />

          {/* Main App Image */}
          <div className="relative z-10 flex justify-center">
            <img
              src="/images/mobiles-hero.png"
              alt="NRM Capital Mobile App Dashboard"
              className="h-auto w-full object-cover"
            />
          </div>

          {/* Floating Bubble 1 */}
          <div
            className="animate-float glass-panel absolute left-0 top-[30%] z-20 flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-4 py-2 shadow-lg backdrop-blur-md lg:-left-8"
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
            className="animate-float glass-panel absolute -left-4 top-[70%] z-20 flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-4 py-2 shadow-lg backdrop-blur-md lg:-left-12"
            style={{ animationDelay: '3s', animationDuration: '7s' }}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-slate-800">Fast Approval</span>
          </div>
        </div>
      </div>
    </section>
  )
}
