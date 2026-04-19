import { CONFIG } from "@/lib/config"

const policies = [
  {
    title: "Repayment",
    description: "Borrowers are expected to make timely payments according to the agreed-upon schedule. Late or missed payments may result in additional fees or penalties.",
  },
  {
    title: "Early Repayment",
    description: "Borrowers may repay the loan early without penalty. In the event of full early repayment, all future interest charges for the remaining term will be waived.",
  },
  {
    title: "Default",
    description: "Failure to repay the loan as agreed may result in default. The borrower may be subject to collection procedures, including legal action and seizure of collateral for secured loans.",
  },
  {
    title: "Restructuring",
    description: "In cases of financial hardship, borrowers may request loan restructuring or deferment. Requests will be reviewed on a case-by-case basis.",
  },
  {
    title: "Privacy & Confidentiality",
    description: "NRM Capital is committed to maintaining the confidentiality of all personal and financial information. Data will only be disclosed as required by law or with borrower's consent.",
  },
  {
    title: "Penalty Policy",
    description: `If your payment is late, you will be charged a penalty of ${CONFIG.DEFAULT_SETTINGS.PENALTY_RATE_PERCENT}% of your amortization payment. Please ensure timely payments to avoid additional charges.`,
  },
]

export function PoliciesSection() {
  return (
    <section className="w-full max-w-5xl">
      <div className="mb-10 text-center">
        <h3 className="mb-3 text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">Our Policies</h3>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          NRM Capital is committed to responsible, transparent lending. Please review these key policies before applying.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {policies.map((policy) => (
          <article key={policy.title} className="glass-panel flex h-full flex-col rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-6 border border-white/40">
            <h4 className="mb-2 text-base font-bold text-slate-900 sm:text-lg">{policy.title}</h4>
            <p className="text-sm leading-relaxed text-slate-600">{policy.description}</p>
          </article>
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-slate-500 sm:text-sm">
        <strong>Policy Amendments:</strong> NRM Capital reserves the right to amend this lending policy at any time. Borrowers will be notified of any significant changes that may affect the terms and conditions of their loans.
      </p>
    </section>
  )
}
