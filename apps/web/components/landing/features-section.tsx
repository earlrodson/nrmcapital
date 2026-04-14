import { Bolt, ShieldCheck, Users } from "lucide-react"

const features = [
  {
    title: "Efficient Processing",
    description: "Structured review and prompt updates from application to release.",
    icon: Bolt,
  },
  {
    title: "Client-Focused Guidance",
    description: "Dedicated assistance to match terms with your financial priorities.",
    icon: Users,
  },
  {
    title: "Reliable Lending Partner",
    description: "Professional documentation, transparent schedules, and accountable service.",
    icon: ShieldCheck,
  },
]

export function FeaturesSection() {
  return (
    <section className="mb-12 w-full max-w-4xl text-center sm:mb-14">
      <h3 className="mb-8 text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">WHY CHOOSE NRM CAPITAL?</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
        {features.map((feature) => (
          <article key={feature.title} className="glass-panel flex h-full flex-col items-center rounded-2xl p-5 text-left sm:p-6">
            <feature.icon className="mb-3 h-10 w-10 text-emerald-500 sm:h-11 sm:w-11" />
            <h4 className="text-base font-bold text-slate-900 sm:text-lg">{feature.title}</h4>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-600">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
