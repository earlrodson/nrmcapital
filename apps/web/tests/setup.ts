process.env = {
  ...process.env,
  NODE_ENV: "test",
  AUTH_SECRET: process.env.AUTH_SECRET ?? "test-auth-secret",
  AUTH_URL: process.env.AUTH_URL ?? "http://localhost:3000",
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "test-auth-secret",
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
};
