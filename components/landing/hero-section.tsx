import Image from "next/image"
import { Sparkles } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative mb-12 w-full text-center sm:mb-14 lg:mb-16">
      <Sparkles className="absolute left-1 top-4 hidden h-8 w-8 text-emerald-400/50 sm:block md:left-4 md:h-10 md:w-10 md:text-emerald-400/60" />
      <Sparkles className="absolute right-1 top-36 hidden h-6 w-6 text-emerald-400/45 md:block md:right-4 md:top-40 md:h-8 md:w-8 md:text-emerald-400/60" />

      <div className="mb-7 flex justify-center sm:mb-8">
        <Image
          src="/images/nrm-capital-logo.png"
          alt="NRM Capital"
          width={200}
          height={200}
          priority
          className="h-auto w-full max-w-[180px] sm:max-w-[200px] md:max-w-[220px]"
        />
      </div>

      <h2 className="mx-auto mb-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-5xl lg:text-6xl">
        NRM Capital provides flexible, transparent, and responsible lending solutions — from personal loans to business financing tailored to your needs.
      </h2>
      <p className="mx-auto mb-8 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
        no hidden fees
      </p>
    </section>
  )
}
