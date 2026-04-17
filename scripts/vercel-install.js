const { execSync } = require("node:child_process")

// #region agent log
fetch("http://127.0.0.1:7598/ingest/839531ee-a886-4d56-891b-2d0fc3d3f3b9", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Debug-Session-Id": "3da53b",
  },
  body: JSON.stringify({
    sessionId: "3da53b",
    runId: process.env.DEBUG_RUN_ID || "pre-fix",
    hypothesisId: "H1-H5",
    location: "scripts/vercel-install.js:3",
    message: "vercel install command environment snapshot",
    data: {
      npm_execpath: process.env.npm_execpath || null,
      npm_command: process.env.npm_command || null,
      npm_config_user_agent: process.env.npm_config_user_agent || null,
      node_version: process.version,
      ci: process.env.CI || null,
      vercel: process.env.VERCEL || null,
      vercel_env: process.env.VERCEL_ENV || null,
      pwd: process.cwd(),
    },
    timestamp: Date.now(),
  }),
}).catch(() => {})
// #endregion

execSync("corepack pnpm install --frozen-lockfile", { stdio: "inherit" })

