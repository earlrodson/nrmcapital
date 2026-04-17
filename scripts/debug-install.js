const payloadBase = {
  sessionId: "3da53b",
  runId: process.env.DEBUG_RUN_ID || "pre-fix",
  hypothesisId: "H1-H4",
  location: "scripts/debug-install.js:1",
  timestamp: Date.now(),
}

// #region agent log
fetch("http://127.0.0.1:7598/ingest/839531ee-a886-4d56-891b-2d0fc3d3f3b9", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Debug-Session-Id": "3da53b",
  },
  body: JSON.stringify({
    ...payloadBase,
    message: "preinstall environment snapshot",
    data: {
      npm_execpath: process.env.npm_execpath || null,
      npm_command: process.env.npm_command || null,
      npm_config_user_agent: process.env.npm_config_user_agent || null,
      npm_package_manager: process.env.npm_package_packageManager || null,
      node_version: process.version,
      ci: process.env.CI || null,
      vercel: process.env.VERCEL || null,
      vercel_env: process.env.VERCEL_ENV || null,
    },
  }),
}).catch(() => {})
// #endregion
