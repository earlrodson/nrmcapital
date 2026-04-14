import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

import { getToken } from "next-auth/jwt";
import { middleware } from "@/middleware";

const getTokenMock = vi.mocked(getToken);

describe("auth middleware", () => {
  beforeEach(() => {
    getTokenMock.mockReset();
  });

  it("redirects to login when AUTH_SECRET is missing", async () => {
    const previous = process.env.AUTH_SECRET;
    delete process.env.AUTH_SECRET;

    const response = await middleware(
      new NextRequest("http://localhost:3000/dashboard"),
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    process.env.AUTH_SECRET = previous;
  });

  it("allows requests when token exists", async () => {
    process.env.AUTH_SECRET = "test-auth-secret";
    getTokenMock.mockResolvedValue({ sub: "u1" } as never);

    const response = await middleware(
      new NextRequest("http://localhost:3000/dashboard"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects unauthenticated requests with callbackUrl", async () => {
    process.env.AUTH_SECRET = "test-auth-secret";
    getTokenMock.mockResolvedValue(null);

    const response = await middleware(
      new NextRequest("http://localhost:3000/reports?range=monthly"),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?callbackUrl=%2Freports%3Frange%3Dmonthly",
    );
  });
});
