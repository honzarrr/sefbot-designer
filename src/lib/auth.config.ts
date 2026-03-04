import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const publicPaths = ['/login', '/register', '/share'];
      const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

      if (isPublicPath) return true;

      // Allow static assets
      if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')
      ) {
        return true;
      }

      if (!isLoggedIn) return false; // Redirects to signIn page

      return true;
    },
  },
  providers: [], // Providers are added in auth.ts (Node.js only)
  session: {
    strategy: 'jwt',
  },
} satisfies NextAuthConfig;
