const { execSync } = require("node:child_process")

const runId = process.env.DEBUG_RUN_ID || "pre-fix"

function agentLog(hypothesisId, location, message, data) {
  // #region agent log
  fetch("http://127.0.0.1:7598/ingest/839531ee-a886-4d56-891b-2d0fc3d3f3b9", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "3da53b",
    },
    body: JSON.stringify({
      sessionId: "3da53b",
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion
}

agentLog("H1-H4", "scripts/vercel-install.js:28", "install command start", {
  node_version: process.version,
  npm_execpath: process.env.npm_execpath || null,
  npm_command: process.env.npm_command || null,
  npm_config_user_agent: process.env.npm_config_user_agent || null,
  ci: process.env.CI || null,
  vercel: process.env.VERCEL || null,
  vercel_env: process.env.VERCEL_ENV || null,
  pwd: process.cwd(),
})

try {
  execSync("corepack --version", { stdio: "pipe" }).toString()
  agentLog("H6", "scripts/vercel-install.js:42", "corepack available", {})
} catch (error) {
  agentLog("H6", "scripts/vercel-install.js:44", "corepack missing", {
    message: error?.message || "unknown error",
  })
  throw error
}

try {
  const pnpmVersion = execSync("corepack pnpm --version", { stdio: "pipe" }).toString().trim()
  agentLog("H7", "scripts/vercel-install.js:53", "pnpm version resolved", { pnpmVersion })
} catch (error) {
  agentLog("H7", "scripts/vercel-install.js:55", "pnpm resolution failed", {
    message: error?.message || "unknown error",
  })
  throw error
}

try {
  agentLog("H8", "scripts/vercel-install.js:63", "running pnpm install", { command: "corepack pnpm install --frozen-lockfile" })
  execSync("corepack pnpm install --frozen-lockfile", { stdio: "inherit" })
  agentLog("H8", "scripts/vercel-install.js:65", "pnpm install succeeded", {})
} catch (error) {
  agentLog("H8", "scripts/vercel-install.js:67", "pnpm install failed", {
    message: error?.message || "unknown error",
    status: error?.status ?? null,
    signal: error?.signal ?? null,
  })
  throw error
}

