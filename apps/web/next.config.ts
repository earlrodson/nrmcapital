import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/db", "@repo/loan-engine"],
}

export default nextConfig
