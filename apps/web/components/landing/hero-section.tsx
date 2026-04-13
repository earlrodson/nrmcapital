import Link from "next/link"
import Image from "next/image"
import { Sparkles } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative mb-12 w-full text-center">
      <Sparkles className="absolute left-4 top-4 hidden h-10 w-10 text-emerald-400/60 md:block" />
      <Sparkles className="absolute right-4 top-40 hidden h-8 w-8 text-emerald-400/60 md:block" />

      <div className="mb-8 flex justify-center">
        <Image src="/images/nrm-capital-logo.png" alt="NRM Capital" width={200} height={200} priority className="h-auto w-full max-w-[200px]" />
      </div>

      <h2 className="mx-auto mb-4 max-w-3xl text-3xl font-extrabold leading-tight text-slate-900 md:text-5xl">
        Practical financing solutions for Filipino individuals and growing businesses.
      </h2>
      <p className="mb-8 text-lg text-slate-600">
        NRM Capital provides transparent lending terms, responsive processing, and professional client support across the
        Philippines.
      </p>

      <Link
        href="/login"
        className="inline-flex rounded-full bg-emerald-600 px-8 py-3 font-bold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
      >
        CHECK YOUR ELIGIBILITY
      </Link>
    </section>
  )
}
