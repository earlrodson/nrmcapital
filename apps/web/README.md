# web

Next.js app for the public site and authenticated lending dashboard.

## UI / shadcn

This app is aligned with the [shadcn/create](https://ui.shadcn.com/create) preset **b1tMdLU9I** (Next template, `radix-mira` style). To reproduce or refresh configuration from the same preset:

```bash
pnpm dlx shadcn@latest init --preset b1tMdLU9I --template next --cwd apps/web --no-monorepo -y
```

If `components.json` already exists and the CLI asks to overwrite it, add `-f` / `--force`:

```bash
pnpm dlx shadcn@latest init --preset b1tMdLU9I --template next --cwd apps/web --no-monorepo -y -f
```

To apply only preset/theme changes without a full init, you can use:

```bash
pnpm dlx shadcn@latest apply --preset b1tMdLU9I --cwd apps/web -y
```

Reinstall registry UI primitives to match the preset (overwrites files under `components/ui/`):

```bash
pnpm dlx shadcn@latest init --preset b1tMdLU9I --template next --cwd apps/web --no-monorepo -y --reinstall
```

Run these from the **monorepo root** so `--cwd apps/web` resolves correctly.
