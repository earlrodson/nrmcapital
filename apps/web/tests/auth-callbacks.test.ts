import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@repo/db";
import { authConfig, authorizeCredentials } from "@/auth";

const findUniqueMock = vi.mocked(prisma.user.findUnique);

describe("auth callbacks", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("rejects malformed credentials without hitting DB", async () => {
    const result = await authorizeCredentials({
      email: "not-an-email",
      password: "123",
    });

    expect(result).toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("rejects inactive users", async () => {
    findUniqueMock.mockResolvedValue({
      id: "u1",
      email: "admin@example.com",
      password_hash: "hash",
      first_name: "Default",
      last_name: "Admin",
      role: "ADMIN",
      is_active: false,
    } as never);

    const result = await authorizeCredentials({
      email: "admin@example.com",
      password: "secret123",
    });

    expect(result).toBeNull();
  });

  it("returns user payload for valid credentials", async () => {
    const { hash } = await import("bcryptjs");
    const passwordHash = await hash("secret123", 4);
    findUniqueMock.mockResolvedValue({
      id: "u1",
      email: "admin@example.com",
      password_hash: passwordHash,
      first_name: "Default",
      last_name: "Admin",
      role: "SUPERADMIN",
      is_active: true,
    } as never);
    const result = (await authorizeCredentials({
      email: "admin@example.com",
      password: "secret123",
    })) as Record<string, string>;

    expect(result).toMatchObject({
      id: "u1",
      email: "admin@example.com",
      first_name: "Default",
      last_name: "Admin",
      role: "SUPERADMIN",
    });
  });

  it("removes token identity when user is deactivated", async () => {
    const jwt = authConfig.callbacks?.jwt;
    findUniqueMock.mockResolvedValue({
      is_active: false,
      role: "ADMIN",
    } as never);

    const token = (await jwt?.({
      token: { id: "u1", role: "ADMIN" },
    } as never)) as Record<string, unknown>;

    expect(token.id).toBeUndefined();
    expect(token.role).toBeUndefined();
  });

  it("syncs token role with database", async () => {
    const jwt = authConfig.callbacks?.jwt;
    findUniqueMock.mockResolvedValue({
      is_active: true,
      role: "SUPERADMIN",
    } as never);

    const token = (await jwt?.({
      token: { id: "u1", role: "ADMIN" },
    } as never)) as Record<string, unknown>;

    expect(token.id).toBe("u1");
    expect(token.role).toBe("SUPERADMIN");
  });

  it("sets session identity only when token is valid", async () => {
    const sessionCb = authConfig.callbacks?.session;

    const invalidSession = (await sessionCb?.({
      session: { user: { email: "admin@example.com" } },
      token: { id: "u1", role: "INVALID" },
    } as never)) as { user: { id?: string; role?: string } };
    expect(invalidSession.user.id).toBeUndefined();
    expect(invalidSession.user.role).toBeUndefined();

    const validSession = (await sessionCb?.({
      session: { user: { email: "admin@example.com" } },
      token: { id: "u1", role: "ADMIN" },
    } as never)) as { user: { id?: string; role?: string } };
    expect(validSession.user.id).toBe("u1");
    expect(validSession.user.role).toBe("ADMIN");
  });
});
