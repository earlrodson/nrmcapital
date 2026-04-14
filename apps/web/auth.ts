import Credentials from "next-auth/providers/credentials";
import NextAuth from "next-auth";
import { compare } from "bcryptjs";
import { z } from "zod";

import { User, prisma } from "@repo/db";

type AppRole = "SUPERADMIN" | "ADMIN";

type AppRole = "SUPERADMIN" | "ADMIN";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const user: User | null = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user?.is_active) return null;

        const passwordMatches = await compare(
          parsed.data.password,
          user.password_hash,
        );
        if (!passwordMatches) return null;

        return {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: AppRole }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role ?? "ADMIN") as AppRole;
      }
      return session;
    },
  },
});

export const { GET, POST } = handlers;
