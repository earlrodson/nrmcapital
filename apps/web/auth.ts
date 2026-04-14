import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import NextAuth from "next-auth";
import { compare } from "bcryptjs";
import { z } from "zod";

import { prisma } from "@repo/db";

type AppRole = "SUPERADMIN" | "ADMIN";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const isAppRole = (value: unknown): value is AppRole =>
  value === "SUPERADMIN" || value === "ADMIN";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: authorizeCredentials,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = isAppRole((user as { role?: unknown }).role)
          ? (user as { role: AppRole }).role
          : undefined;
      }

      if (typeof token.id !== "string") {
        return token;
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: token.id },
        select: { is_active: true, role: true },
      });

      if (!currentUser?.is_active) {
        delete token.id;
        delete token.role;
        return token;
      }

      token.role = currentUser.role;
      return token;
    },
    async session({ session, token }) {
      if (
        session.user &&
        typeof token.id === "string" &&
        isAppRole(token.role)
      ) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export async function authorizeCredentials(rawCredentials: unknown) {
  const parsed = credentialsSchema.safeParse(rawCredentials);
  if (!parsed.success) return null;

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (!user?.is_active) return null;

  const passwordMatches = await compare(parsed.data.password, user.password_hash);
  if (!passwordMatches) return null;

  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
  };
}

export const { GET, POST } = handlers;
