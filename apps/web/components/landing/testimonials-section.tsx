const testimonials = [
  "NRM Capital handled our application professionally and kept us informed at every step.",
  "The payment schedule was clearly explained, which made planning our monthly budget easier.",
  "From requirements to release, the team was responsive, organized, and easy to work with.",
]

export function TestimonialsSection() {
  return (
    <section className="w-full max-w-4xl">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
        {testimonials.map((quote) => (
          <article key={quote} className="glass-panel flex h-full flex-col justify-between rounded-2xl p-5 sm:p-6">
            <p className="mb-3 text-sm leading-relaxed text-slate-600">{`"${quote}"`}</p>
            <p className="text-sm text-yellow-500">★★★★★</p>
          </article>
        ))}
      </div>
    </section>
  )
}
