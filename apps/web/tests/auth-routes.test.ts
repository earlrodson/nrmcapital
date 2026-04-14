import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET, POST } from "@/app/api/auth/[...nextauth]/route";

describe("next-auth generated API URLs", () => {
  it("serves providers endpoint", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/auth/providers"),
    );
    const data = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(data.credentials).toBeDefined();
  });

  it("serves csrf endpoint", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/auth/csrf"),
    );
    const data = (await response.json()) as { csrfToken?: string };

    expect(response.status).toBe(200);
    expect(typeof data.csrfToken).toBe("string");
  });

  it("serves session endpoint for unauthenticated user", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/auth/session"),
    );
    const data = (await response.json()) as { user?: unknown } | null;

    expect(response.status).toBe(200);
    expect(data).toBeNull();
  });

  it("handles signout endpoint requests", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/auth/signout", {
        method: "POST",
      }),
    );

    expect(response.status).not.toBe(404);
    expect(response.status).toBeLessThan(500);
  });

  it("handles credentials callback endpoint requests", async () => {
    const body = new URLSearchParams({
      email: "admin@example.com",
      password: "invalid-password",
      csrfToken: "invalid",
    });
    const response = await POST(
      new NextRequest("http://localhost:3000/api/auth/callback/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }),
    );

    expect(response.status).not.toBe(404);
    expect(response.status).toBeLessThan(500);
  });
});
