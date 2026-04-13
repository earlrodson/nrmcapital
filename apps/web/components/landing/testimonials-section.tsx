const testimonials = [
  "NRM Capital handled our application professionally and kept us informed at every step.",
  "The payment schedule was clearly explained, which made planning our monthly budget easier.",
  "From requirements to release, the team was responsive, organized, and easy to work with.",
]

export function TestimonialsSection() {
  return (
    <section className="w-full max-w-4xl">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {testimonials.map((quote) => (
          <article key={quote} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm text-slate-600">{`"${quote}"`}</p>
            <p className="text-sm text-yellow-500">★★★★★</p>
          </article>
        ))}
      </div>
    </section>
  )
}
