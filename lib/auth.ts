import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import authConfig from "@/lib/auth.config";
import { trackGa4ServerEvent } from "@/lib/analytics.server";

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  ...authConfig,
  events: {
    async signIn({ user, account, isNewUser }) {
      void trackGa4ServerEvent({
        eventName: "login",
        userId: user?.id ?? null,
        params: {
          method: account?.provider ?? "unknown",
          provider: account?.provider ?? "unknown",
          is_new_user: Boolean(isNewUser),
        },
      });
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id!;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
