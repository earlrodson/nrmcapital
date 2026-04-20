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
    <section className="mb-24 w-full max-w-5xl text-center">
      <h3 className="animate-fade-up mb-8 text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">Types of Loans Offered</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {features.map((feature, idx) => (
          <article 
            key={feature.title} 
            className="animate-fade-up glass-panel group flex h-full flex-col items-center rounded-2xl p-5 text-center transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(16,185,129,0.1)] hover:border-emerald-400/40 sm:p-6 border border-white/40 shadow-[0_8px_30px_rgb(16,185,129,0.05)]"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="mb-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-3 transition-all duration-500 group-hover:scale-110 group-hover:from-emerald-100 group-hover:to-teal-100 border border-white/60 shadow-sm">
              <feature.icon className="h-8 w-8 text-emerald-600 sm:h-10 sm:w-10" />
            </div>
            <h4 className="text-base font-bold text-slate-950 sm:text-lg">{feature.title}</h4>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
