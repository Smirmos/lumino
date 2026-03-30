import type { NextAuthConfig } from 'next-auth';

/**
 * Lightweight auth config — safe for Edge Runtime (middleware).
 * Does NOT include the Credentials provider or any Node.js imports.
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
    error: '/login',
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.clientId = user.clientId ?? null;
        token.isAdmin = user.isAdmin ?? false;
        token.userId = user.id!;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.clientId = token.clientId as string | null;
      session.user.isAdmin = token.isAdmin as boolean;
      session.user.id = token.userId as string;
      return session;
    },
  },

  providers: [], // Filled in auth.ts with Credentials provider

  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
};
