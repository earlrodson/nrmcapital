import { AlertTriangle, Briefcase, GraduationCap, User } from "lucide-react"

const features = [
  {
    title: "Personal Loans",
    description: "For individual borrowers — personal, family, or household needs.",
    icon: User,
  },
  {
    title: "Business Loans",
    description: "Funding for operations, expansion, or capital needs of businesses.",
    icon: Briefcase,
  },
  {
    title: "Student Loans",
    description: "Designed to finance educational expenses for students.",
    icon: GraduationCap,
  },
  {
    title: "Emergency Loans",
    description: "Specialized loans for urgent and unforeseen financial needs.",
    icon: AlertTriangle,
  },
]

export function FeaturesSection() {
  return (
    <section className="mb-12 w-full max-w-5xl text-center sm:mb-14">
      <h3 className="mb-8 text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">Types of Loans Offered</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {features.map((feature) => (
          <article key={feature.title} className="glass-panel flex h-full flex-col items-center rounded-2xl p-5 text-center sm:p-6">
            <feature.icon className="mb-3 h-10 w-10 text-emerald-500 sm:h-11 sm:w-11" />
            <h4 className="text-base font-bold text-slate-900 sm:text-lg">{feature.title}</h4>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
