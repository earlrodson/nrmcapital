type PlaceholderPageProps = {
  title: string
  route: string
  description?: string
}

export function PlaceholderPage({
  title,
  route,
  description = "Blank placeholder page for upcoming implementation.",
}: PlaceholderPageProps) {
  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,rgba(21,128,61,0.14),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,245,1))] px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-5xl items-center justify-center">
        <section className="w-full rounded-3xl border border-border/70 bg-background/90 p-8 shadow-sm backdrop-blur md:p-12">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
            Route Placeholder
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            {description}
          </p>
          <div className="mt-8 inline-flex rounded-full border border-border bg-muted px-4 py-2 font-mono text-sm text-muted-foreground">
            {route}
          </div>
        </section>
      </div>
    </main>
  )
}
