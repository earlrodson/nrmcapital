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
    <section className="mb-12 w-full max-w-4xl text-center">
      <h3 className="mb-8 text-xl font-bold text-slate-800">WHY CHOOSE NRM CAPITAL?</h3>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {features.map((feature) => (
          <article key={feature.title} className="flex flex-col items-center">
            <feature.icon className="mb-3 h-12 w-12 text-emerald-500" />
            <h4 className="text-lg font-bold text-slate-900">{feature.title}</h4>
            <p className="mt-2 max-w-xs text-sm text-slate-600">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
